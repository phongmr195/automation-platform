import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireOrganization, requireRole } from '../middleware/organization';
import { organizationService } from '../services/organizationService';
import { z } from 'zod';

const app = new Hono();

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

const inviteMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
});

// Apply auth middleware to all routes
app.use('*', authMiddleware);

/**
 * GET /organizations
 * Get all organizations for current user
 */
app.get('/', async (c) => {
  const userId = c.get('userId') as string;

  const organizations = await organizationService.getUserOrganizations(userId);

  return c.json({
    organizations,
    total: organizations.length,
  });
});

/**
 * POST /organizations
 * Create a new organization
 */
app.post('/', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json();

  // Validate input
  const validation = createOrganizationSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { error: 'Validation failed', details: validation.error.errors },
      400
    );
  }

  const { name, slug, description } = validation.data;

  try {
    const organization = await organizationService.createOrganization({
      name,
      slug,
      description,
      ownerId: userId,
    });

    return c.json(organization, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * GET /organizations/:organizationId
 * Get organization details
 */
app.get('/:organizationId', requireOrganization, async (c) => {
  const organizationId = c.get('organizationId') as string;

  const organization = await organizationService.getOrganization(organizationId);

  if (!organization) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json(organization);
});

/**
 * PUT /organizations/:organizationId
 * Update organization details (requires ADMIN role)
 */
app.put('/:organizationId', requireOrganization, requireRole('ADMIN'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;
  const body = await c.req.json();

  // Validate input
  const validation = updateOrganizationSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { error: 'Validation failed', details: validation.error.errors },
      400
    );
  }

  try {
    const organization = await organizationService.updateOrganization(
      organizationId,
      userId,
      validation.data
    );

    return c.json(organization);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * DELETE /organizations/:organizationId
 * Delete organization (requires OWNER role)
 */
app.delete('/:organizationId', requireOrganization, requireRole('OWNER'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;

  try {
    await organizationService.deleteOrganization(organizationId, userId);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * GET /organizations/:organizationId/members
 * Get organization members
 */
app.get('/:organizationId/members', requireOrganization, async (c) => {
  const organizationId = c.get('organizationId') as string;

  const organization = await organizationService.getOrganization(organizationId);

  if (!organization) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json({
    members: organization.members,
    total: organization.members.length,
  });
});

/**
 * POST /organizations/:organizationId/members
 * Invite member to organization (requires ADMIN role)
 */
app.post('/:organizationId/members', requireOrganization, requireRole('ADMIN'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;
  const body = await c.req.json();

  // Validate input
  const validation = inviteMemberSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { error: 'Validation failed', details: validation.error.errors },
      400
    );
  }

  try {
    const member = await organizationService.inviteMember({
      organizationId,
      userId: validation.data.userId,
      role: validation.data.role as any,
      invitedBy: userId,
    });

    return c.json(member, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * PUT /organizations/:organizationId/members/:memberId/role
 * Update member role (requires OWNER role)
 */
app.put('/:organizationId/members/:memberId/role', requireOrganization, requireRole('OWNER'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;
  const memberId = c.req.param('memberId');
  const body = await c.req.json();

  // Validate input
  const validation = updateMemberRoleSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { error: 'Validation failed', details: validation.error.errors },
      400
    );
  }

  try {
    const member = await organizationService.updateMemberRole({
      organizationId,
      userId: memberId,
      role: validation.data.role as any,
      updatedBy: userId,
    });

    return c.json(member);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * DELETE /organizations/:organizationId/members/:memberId
 * Remove member from organization (requires ADMIN role)
 */
app.delete('/:organizationId/members/:memberId', requireOrganization, requireRole('ADMIN'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;
  const memberId = c.req.param('memberId');

  try {
    await organizationService.removeMember(organizationId, memberId, userId);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * POST /organizations/:organizationId/leave
 * Leave organization
 */
app.post('/:organizationId/leave', requireOrganization, async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;

  try {
    await organizationService.leaveOrganization(organizationId, userId);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * GET /organizations/:organizationId/audit-logs
 * Get audit logs (requires MEMBER role)
 */
app.get('/:organizationId/audit-logs', requireOrganization, async (c) => {
  const organizationId = c.get('organizationId') as string;
  const userId = c.get('userId') as string;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await organizationService.getAuditLogs(organizationId, userId, {
      limit,
      offset,
    });

    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default app;
