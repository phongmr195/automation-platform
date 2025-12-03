import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
}

export interface InviteMemberInput {
  organizationId: string;
  userId: string;
  role: Role;
  invitedBy: string;
}

export interface UpdateMemberRoleInput {
  organizationId: string;
  userId: string;
  role: Role;
  updatedBy: string;
}

export class OrganizationService {
  /**
   * Create a new organization with the creator as OWNER
   */
  async createOrganization(input: CreateOrganizationInput) {
    const { name, slug, description, ownerId } = input;

    // Check if slug is already taken
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new Error(`Organization slug "${slug}" is already taken`);
    }

    // Create organization with owner as member
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      organizationId: organization.id,
      userId: ownerId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: organization.id,
      metadata: { name, slug },
    });

    return organization;
  }

  /**
   * Get organization by ID with members
   */
  async getOrganization(organizationId: string) {
    return prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                verified: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            workflows: true,
            credentials: true,
          },
        },
      },
    });
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                workflows: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    return !!member;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<Role | null> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    return member?.role || null;
  }

  /**
   * Check if user has permission (role-based)
   */
  async hasPermission(
    organizationId: string,
    userId: string,
    requiredRole: Role
  ): Promise<boolean> {
    const userRole = await this.getUserRole(organizationId, userId);
    if (!userRole) return false;

    const roleHierarchy: Record<Role, number> = {
      OWNER: 4,
      ADMIN: 3,
      MEMBER: 2,
      VIEWER: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Invite/add member to organization
   */
  async inviteMember(input: InviteMemberInput) {
    const { organizationId, userId, role, invitedBy } = input;

    // Check if inviter has permission (must be ADMIN or OWNER)
    const canInvite = await this.hasPermission(organizationId, invitedBy, 'ADMIN');
    if (!canInvite) {
      throw new Error('You do not have permission to invite members');
    }

    // Check if user is already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    // Add member
    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      organizationId,
      userId: invitedBy,
      action: 'member.invited',
      resourceType: 'member',
      resourceId: member.id,
      metadata: { invitedUserId: userId, role },
    });

    return member;
  }

  /**
   * Update member role
   */
  async updateMemberRole(input: UpdateMemberRoleInput) {
    const { organizationId, userId, role, updatedBy } = input;

    // Check if updater has permission (must be OWNER)
    const canUpdate = await this.hasPermission(organizationId, updatedBy, 'OWNER');
    if (!canUpdate) {
      throw new Error('Only organization owners can change member roles');
    }

    // Cannot change own role
    if (userId === updatedBy) {
      throw new Error('Cannot change your own role');
    }

    const member = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      organizationId,
      userId: updatedBy,
      action: 'member.role_changed',
      resourceType: 'member',
      resourceId: member.id,
      metadata: { targetUserId: userId, newRole: role },
    });

    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string, removedBy: string) {
    // Check if remover has permission
    const canRemove = await this.hasPermission(organizationId, removedBy, 'ADMIN');
    if (!canRemove) {
      throw new Error('You do not have permission to remove members');
    }

    // Cannot remove yourself (use leaveOrganization instead)
    if (userId === removedBy) {
      throw new Error('Cannot remove yourself. Use leave organization instead.');
    }

    // Cannot remove the last owner
    const targetRole = await this.getUserRole(organizationId, userId);
    if (targetRole === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner of the organization');
      }
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      organizationId,
      userId: removedBy,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: userId,
      metadata: { removedUserId: userId },
    });

    return { success: true };
  }

  /**
   * Leave organization
   */
  async leaveOrganization(organizationId: string, userId: string) {
    const role = await this.getUserRole(organizationId, userId);
    
    // If user is owner, check if there are other owners
    if (role === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        throw new Error(
          'Cannot leave organization as the last owner. Transfer ownership or delete the organization.'
        );
      }
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      organizationId,
      userId,
      action: 'member.left',
      resourceType: 'member',
      resourceId: userId,
    });

    return { success: true };
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    organizationId: string,
    userId: string,
    data: { name?: string; description?: string; slug?: string }
  ) {
    // Check permission
    const canUpdate = await this.hasPermission(organizationId, userId, 'ADMIN');
    if (!canUpdate) {
      throw new Error('You do not have permission to update this organization');
    }

    // If slug is being changed, check availability
    if (data.slug) {
      const existing = await prisma.organization.findFirst({
        where: {
          slug: data.slug,
          id: { not: organizationId },
        },
      });

      if (existing) {
        throw new Error(`Slug "${data.slug}" is already taken`);
      }
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data,
    });

    // Create audit log
    await this.createAuditLog({
      organizationId,
      userId,
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: data,
    });

    return organization;
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string, userId: string) {
    // Only owner can delete
    const canDelete = await this.hasPermission(organizationId, userId, 'OWNER');
    if (!canDelete) {
      throw new Error('Only organization owners can delete the organization');
    }

    // Create audit log before deletion
    await this.createAuditLog({
      organizationId,
      userId,
      action: 'organization.deleted',
      resourceType: 'organization',
      resourceId: organizationId,
    });

    await prisma.organization.delete({
      where: { id: organizationId },
    });

    return { success: true };
  }

  /**
   * Get audit logs for organization
   */
  async getAuditLogs(
    organizationId: string,
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ) {
    // Check permission
    const canView = await this.hasPermission(organizationId, userId, 'MEMBER');
    if (!canView) {
      throw new Error('You do not have permission to view audit logs');
    }

    const { limit = 50, offset = 0 } = options;

    const logs = await prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditLog.count({
      where: { organizationId },
    });

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: {
    organizationId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data,
    });
  }
}

export const organizationService = new OrganizationService();
