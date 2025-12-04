import { Hono } from 'hono';
import axios from 'axios';
import { oauthService, type OAuthProfile } from '../services/oauthService';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const app = new Hono();

/**
 * ============================================
 * GOOGLE OAUTH2
 * ============================================
 */

// Step 1: Redirect to Google
app.get('/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  const scope = 'email profile';
  
  if (!clientId || !redirectUri) {
    return c.json({ error: 'Google OAuth not configured' }, 500);
  }
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  })}`;
  
  return c.redirect(authUrl);
});

// Step 2: Handle callback
app.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const error = c.req.query('error');
    
    if (error || !code) {
      console.error('Google OAuth error:', error);
      return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    });
    
    const { access_token } = tokenResponse.data;
    
    // Get user profile
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    const { id, email, name, picture } = profileResponse.data;
    
    // Create or update user
    const profile: OAuthProfile = {
      provider: 'google',
      providerId: id,
      email,
      name,
      avatar: picture,
    };
    
    const user = await oauthService.findOrCreateUser(profile);
    const tokens = await oauthService.generateTokens(user.id);
    
    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?${new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })}`;
    
    return c.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Google OAuth error:', error.response?.data || error.message);
    return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

/**
 * ============================================
 * GITHUB OAUTH2
 * ============================================
 */

app.get('/github', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = 'user:email';
  
  if (!clientId || !redirectUri) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500);
  }
  
  const authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
  })}`;
  
  return c.redirect(authUrl);
});

app.get('/github/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const error = c.req.query('error');
    
    if (error || !code) {
      console.error('GitHub OAuth error:', error);
      return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    
    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    // Get user profile
    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    // Get primary email
    const emailsResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    const primaryEmail = emailsResponse.data.find((e: any) => e.primary)?.email;
    const { id, name, avatar_url, login } = profileResponse.data;
    
    if (!primaryEmail) {
      console.error('GitHub: No primary email found');
      return c.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
    }
    
    const profile: OAuthProfile = {
      provider: 'github',
      providerId: String(id),
      email: primaryEmail,
      name: name || login,
      avatar: avatar_url,
    };
    
    const user = await oauthService.findOrCreateUser(profile);
    const tokens = await oauthService.generateTokens(user.id);
    
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?${new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })}`;
    
    return c.redirect(redirectUrl);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

/**
 * ============================================
 * LINKEDIN OAUTH2
 * ============================================
 */

app.get('/linkedin', (c) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_CALLBACK_URL;
  const scope = 'r_liteprofile r_emailaddress';
  
  if (!clientId || !redirectUri) {
    return c.json({ error: 'LinkedIn OAuth not configured' }, 500);
  }
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
  })}`;
  
  return c.redirect(authUrl);
});

app.get('/linkedin/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const error = c.req.query('error');
    
    if (error || !code) {
      console.error('LinkedIn OAuth error:', error);
      return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    
    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    // Get user profile
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    // Get email
    const emailResponse = await axios.get(
      'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    
    const email = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress;
    const { id, localizedFirstName, localizedLastName } = profileResponse.data;
    
    if (!email) {
      console.error('LinkedIn: No email found');
      return c.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
    }
    
    const profile: OAuthProfile = {
      provider: 'linkedin',
      providerId: id,
      email,
      name: `${localizedFirstName} ${localizedLastName}`,
    };
    
    const user = await oauthService.findOrCreateUser(profile);
    const tokens = await oauthService.generateTokens(user.id);
    
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?${new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })}`;
    
    return c.redirect(redirectUrl);
  } catch (error: any) {
    console.error('LinkedIn OAuth error:', error.response?.data || error.message);
    return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

/**
 * ============================================
 * UNLINK PROVIDER
 * ============================================
 */

app.post('/unlink/:provider', authMiddleware, async (c: any) => {
  try {
    const userId = c.get('userId') as string;
    const provider = c.req.param('provider') as 'google' | 'github' | 'linkedin';
    
    if (!['google', 'github', 'linkedin'].includes(provider)) {
      return c.json({ error: 'Invalid provider' }, 400);
    }
    
    // Check if user has password (prevent locking out)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, googleId: true, githubId: true, linkedinId: true },
    });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Count linked providers
    const linkedProviders = [user.googleId, user.githubId, user.linkedinId].filter(Boolean).length;
    
    // Prevent unlinking if it's the only auth method
    if (!user.password && linkedProviders === 1) {
      return c.json({ 
        error: 'Cannot unlink the only authentication method. Please set a password first.' 
      }, 400);
    }
    
    const updatedUser = await oauthService.unlinkProvider(userId, provider);
    
    return c.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        googleId: updatedUser.googleId,
        githubId: updatedUser.githubId,
        linkedinId: updatedUser.linkedinId,
      },
    });
  } catch (error: any) {
    console.error('Unlink provider error:', error);
    return c.json({ error: 'Failed to unlink provider' }, 500);
  }
});

export default app;
