import type { Context, Next } from 'hono';
import { organizationService } from '../services/organizationService';
import type { Role } from '@prisma/client';

/**
 * Middleware to validate organization membership
 * Requires authMiddleware to be applied first
 */
export async function requireOrganization(c: Context, next: Next) {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const organizationId = c.req.param('organizationId') || c.req.query('organizationId');
  if (!organizationId) {
    return c.json({ error: 'Organization ID is required' }, 400);
  }

  // Check if user is member
  const isMember = await organizationService.isMember(organizationId, userId);
  if (!isMember) {
    return c.json({ error: 'You are not a member of this organization' }, 403);
  }

  // Get user's role in organization
  const role = await organizationService.getUserRole(organizationId, userId);
  
  // Store in context for use in handlers
  c.set('organizationId', organizationId);
  c.set('organizationRole', role);

  await next();
}

/**
 * Middleware to check minimum role requirement
 */
export function requireRole(requiredRole: Role) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const organizationId = c.get('organizationId');

    if (!userId || !organizationId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const hasPermission = await organizationService.hasPermission(
      organizationId,
      userId,
      requiredRole
    );

    if (!hasPermission) {
      return c.json(
        { error: `This action requires ${requiredRole} role or higher` },
        403
      );
    }

    await next();
  };
}

/**
 * Helper to get organization context from request
 */
export function getOrganizationContext(c: Context) {
  return {
    organizationId: c.get('organizationId') as string | undefined,
    role: c.get('organizationRole') as Role | undefined,
    userId: c.get('userId') as string | undefined,
  };
}
