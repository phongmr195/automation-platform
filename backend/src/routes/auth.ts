import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword, validatePasswordStrength } from '../lib/password';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  getRefreshTokenExpiry 
} from '../lib/jwt';
import { authMiddleware, getAuthUserId } from '../middleware/auth';

const auth = new Hono();

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    // Validate input
    if (!email || !password) {
      return c.json(
        { error: 'Email and password are required' },
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json(
        { error: 'Invalid email format' },
        400
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return c.json(
        { error: passwordValidation.error },
        400
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return c.json(
        { error: 'User with this email already exists' },
        409
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        verified: true,
        createdAt: true,
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token in database
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      }
    });

    return c.json({
      message: 'User registered successfully',
      user,
      tokens: {
        accessToken,
        refreshToken,
      }
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return c.json(
      { error: 'Failed to register user' },
      500
    );
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Validate input
    if (!email || !password) {
      return c.json(
        { error: 'Email and password are required' },
        400
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return c.json(
        { error: 'Invalid email or password' },
        401
      );
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return c.json(
        { error: 'Invalid email or password' },
        401
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token in database
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      }
    });

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.verified,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      { error: 'Failed to login' },
      500
    );
  }
});

/**
 * POST /auth/logout
 * Logout and invalidate refresh token
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const userId = getAuthUserId(c);
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json(
        { error: 'Refresh token is required' },
        400
      );
    }

    // Delete the session
    await prisma.session.deleteMany({
      where: {
        userId,
        refreshToken,
      }
    });

    return c.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return c.json(
      { error: 'Failed to logout' },
      500
    );
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
auth.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json(
        { error: 'Refresh token is required' },
        400
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return c.json(
        { error: 'Invalid or expired refresh token' },
        401
      );
    }

    // Check if session exists in database
    const session = await prisma.session.findFirst({
      where: {
        userId: payload.userId,
        refreshToken,
        expiresAt: {
          gt: new Date(), // Not expired
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            verified: true,
          }
        }
      }
    });

    if (!session) {
      return c.json(
        { error: 'Invalid or expired refresh token' },
        401
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
    });

    return c.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        refreshToken, // Keep the same refresh token
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json(
      { error: 'Failed to refresh token' },
      500
    );
  }
});

/**
 * GET /auth/me
 * Get current user information (requires authentication)
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const userId = getAuthUserId(c);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        verified: true,
        createdAt: true,
      }
    });

    if (!user) {
      return c.json(
        { error: 'User not found' },
        404
      );
    }

    return c.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json(
      { error: 'Failed to get user information' },
      500
    );
  }
});

/**
 * DELETE /auth/sessions
 * Delete all sessions for the current user (logout from all devices)
 */
auth.delete('/sessions', authMiddleware, async (c) => {
  try {
    const userId = getAuthUserId(c);

    const result = await prisma.session.deleteMany({
      where: { userId }
    });

    return c.json({
      message: 'All sessions deleted successfully',
      deletedCount: result.count,
    });

  } catch (error) {
    console.error('Delete sessions error:', error);
    return c.json(
      { error: 'Failed to delete sessions' },
      500
    );
  }
});

export default auth;
