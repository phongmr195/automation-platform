import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';

export interface OAuthProfile {
  provider: 'google' | 'github' | 'linkedin';
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

export class OAuthService {
  /**
   * Find or create user from OAuth profile
   */
  async findOrCreateUser(profile: OAuthProfile) {
    const { provider, providerId, email, name, avatar } = profile;
    
    // Build where clause based on provider
    const whereClause: any = {};
    if (provider === 'google') whereClause.googleId = providerId;
    if (provider === 'github') whereClause.githubId = providerId;
    if (provider === 'linkedin') whereClause.linkedinId = providerId;
    
    // Try to find existing user by provider ID
    let user = await prisma.user.findFirst({ where: whereClause });
    
    if (user) {
      // Update user info if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatar: avatar || user.avatar,
          verified: true, // Auto-verify OAuth users
        },
      });
      return user;
    }
    
    // Try to find by email (link to existing account)
    user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      // Link OAuth provider to existing account
      const updateData: any = {
        verified: true,
        avatar: avatar || user.avatar,
      };
      
      if (provider === 'google') updateData.googleId = providerId;
      if (provider === 'github') updateData.githubId = providerId;
      if (provider === 'linkedin') updateData.linkedinId = providerId;
      
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      return user;
    }
    
    // Create new user
    const createData: any = {
      email,
      name,
      avatar,
      verified: true,
      password: null, // OAuth users don't need password
    };
    
    if (provider === 'google') createData.googleId = providerId;
    if (provider === 'github') createData.githubId = providerId;
    if (provider === 'linkedin') createData.linkedinId = providerId;
    
    user = await prisma.user.create({ data: createData });
    return user;
  }
  
  /**
   * Generate JWT tokens for OAuth user
   */
  async generateTokens(userId: string) {
    // Get user email for token payload
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const accessToken = generateAccessToken({ userId, email: user.email });
    const refreshToken = generateRefreshToken({ userId, email: user.email });
    
    // Store refresh token in database
    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    
    return {
      accessToken,
      refreshToken,
    };
  }
  
  /**
   * Unlink OAuth provider from user account
   */
  async unlinkProvider(userId: string, provider: 'google' | 'github' | 'linkedin') {
    const updateData: any = {};
    
    if (provider === 'google') updateData.googleId = null;
    if (provider === 'github') updateData.githubId = null;
    if (provider === 'linkedin') updateData.linkedinId = null;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    return user;
  }
}

export const oauthService = new OAuthService();
