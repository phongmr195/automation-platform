import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

/**
 * Extended context type with user information
 */
export interface AuthContext extends Context {
  userId?: string;
  userEmail?: string;
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and attaches user info to context
 */
export async function authMiddleware(c: Context, next: Next) {
  // Get token from Authorization header
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { 
        error: 'Unauthorized', 
        message: 'Missing or invalid Authorization header' 
      },
      401
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify token
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return c.json(
      { 
        error: 'Unauthorized', 
        message: 'Invalid or expired token' 
      },
      401
    );
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, verified: true }
  });

  if (!user) {
    return c.json(
      { 
        error: 'Unauthorized', 
        message: 'User not found' 
      },
      401
    );
  }

  // Attach user info to context
  c.set('userId', user.id);
  c.set('userEmail', user.email);
  c.set('userVerified', user.verified);

  await next();
}

/**
 * Optional authentication middleware
 * Attaches user info to context if token is valid, but doesn't block the request
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, verified: true }
      });
      
      if (user) {
        c.set('userId', user.id);
        c.set('userEmail', user.email);
        c.set('userVerified', user.verified);
      }
    }
  }

  await next();
}

/**
 * Helper to get authenticated user ID from context
 */
export function getAuthUserId(c: Context): string {
  const userId = c.get('userId');
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}

/**
 * Helper to get authenticated user email from context
 */
export function getAuthUserEmail(c: Context): string {
  const userEmail = c.get('userEmail');
  if (!userEmail) {
    throw new Error('User not authenticated');
  }
  return userEmail;
}
