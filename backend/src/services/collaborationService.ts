import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import type { CollaboratorPermission, NotificationType } from '@prisma/client';
import IORedis from 'ioredis';

// Initialize Redis for real-time events
const redis = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

/**
 * Collaboration Service
 * Handles comments, @mentions, activity tracking, notifications, and real-time collaboration
 */
export class CollaborationService {
  // =========================================
  // COLLABORATORS
  // =========================================

  /**
   * Add a collaborator to a workflow
   */
  async addCollaborator(data: {
    workflowId: string;
    userId: string;
    permission: CollaboratorPermission;
    invitedBy: string;
  }) {
    const collaborator = await prisma.workflowCollaborator.create({
      data: {
        workflowId: data.workflowId,
        userId: data.userId,
        permission: data.permission,
        invitedBy: data.invitedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Create activity
    await this.createActivity({
      workflowId: data.workflowId,
      userId: data.invitedBy,
      type: 'COLLABORATOR_ADDED',
      action: 'collaborator.added',
      targetType: 'collaborator',
      targetId: collaborator.id,
      metadata: {
        collaboratorEmail: collaborator.user.email,
        permission: data.permission,
      },
    });

    // Notify the invited user
    await this.createNotification({
      userId: data.userId,
      workflowId: data.workflowId,
      type: 'WORKFLOW_SHARED',
      title: 'Workflow shared with you',
      message: `You have been added as a ${data.permission.toLowerCase()} to a workflow`,
      actionUrl: `/editor/${data.workflowId}`,
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'collaborator.added',
      workflowId: data.workflowId,
      userId: data.invitedBy,
      data: collaborator,
    });

    return collaborator;
  }

  /**
   * Remove a collaborator from a workflow
   */
  async removeCollaborator(workflowId: string, userId: string, removedBy: string) {
    const collaborator = await prisma.workflowCollaborator.findUnique({
      where: {
        workflowId_userId: {
          workflowId,
          userId,
        },
      },
    });

    if (!collaborator) {
      throw new Error('Collaborator not found');
    }

    await prisma.workflowCollaborator.delete({
      where: {
        workflowId_userId: {
          workflowId,
          userId,
        },
      },
    });

    // Create activity
    await this.createActivity({
      workflowId,
      userId: removedBy,
      type: 'COLLABORATOR_REMOVED',
      action: 'collaborator.removed',
      targetType: 'collaborator',
      targetId: collaborator.id,
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'collaborator.removed',
      workflowId,
      userId: removedBy,
      data: { userId },
    });

    return { success: true };
  }

  /**
   * Get all collaborators for a workflow
   */
  async getCollaborators(workflowId: string) {
    const collaborators = await prisma.workflowCollaborator.findMany({
      where: { workflowId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { invitedAt: 'asc' },
    });

    return collaborators;
  }

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(
    workflowId: string,
    userId: string,
    permission: CollaboratorPermission
  ) {
    const collaborator = await prisma.workflowCollaborator.update({
      where: {
        workflowId_userId: {
          workflowId,
          userId,
        },
      },
      data: { permission },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'collaborator.permission_updated',
      workflowId,
      userId: updatedBy,
      data: collaborator,
    });

    return collaborator;
  }

  /**
   * Update collaborator presence (cursor position, active status)
   */
  async updatePresence(data: {
    workflowId: string;
    userId: string;
    cursorPosition?: { x: number; y: number; nodeId?: string } | null;
    isActive: boolean;
  }) {
    const collaborator = await prisma.workflowCollaborator.update({
      where: {
        workflowId_userId: {
          workflowId: data.workflowId,
          userId: data.userId,
        },
      },
      data: {
        lastSeenAt: new Date(),
        cursorPosition: data.cursorPosition || Prisma.DbNull,
        isActive: data.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Emit real-time event (don't create activity for presence updates)
    await this.emitRealtimeEvent('collaboration', {
      type: 'presence.updated',
      workflowId: data.workflowId,
      userId: data.userId,
      data: collaborator,
    });

    return collaborator;
  }

  /**
   * Get active collaborators (currently viewing the workflow)
   */
  async getActiveCollaborators(workflowId: string) {
    // Consider active if last seen within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const active = await prisma.workflowCollaborator.findMany({
      where: {
        workflowId,
        isActive: true,
        lastSeenAt: {
          gte: fiveMinutesAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return active;
  }

  // =========================================
  // COMMENTS
  // =========================================

  /**
   * Create a comment on a workflow
   */
  async createComment(data: {
    workflowId: string;
    userId: string;
    content: string;
    nodeId?: string;
    position?: { x: number; y: number };
    parentId?: string;
  }) {
    // Extract @mentions from content
    const mentions = this.extractMentions(data.content);

    const comment = await prisma.workflowComment.create({
      data: {
        workflowId: data.workflowId,
        userId: data.userId,
        content: data.content,
        nodeId: data.nodeId,
        position: data.position || Prisma.DbNull,
        parentId: data.parentId,
        mentions: mentions.length > 0 ? mentions : Prisma.DbNull,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Create activity
    await this.createActivity({
      workflowId: data.workflowId,
      userId: data.userId,
      type: data.parentId ? 'COMMENT_ADDED' : 'COMMENT_ADDED',
      action: data.parentId ? 'comment.replied' : 'comment.created',
      targetType: 'comment',
      targetId: comment.id,
      metadata: {
        nodeId: data.nodeId,
        isReply: !!data.parentId,
      },
    });

    // Handle @mentions - send notifications
    if (mentions.length > 0) {
      await this.handleMentions(mentions, comment.id, data.workflowId, data.userId);
    }

    // If this is a reply, notify the parent comment author
    if (data.parentId) {
      const parentComment = await prisma.workflowComment.findUnique({
        where: { id: data.parentId },
      });

      if (parentComment && parentComment.userId !== data.userId) {
        await this.createNotification({
          userId: parentComment.userId,
          workflowId: data.workflowId,
          type: 'COMMENT_REPLY',
          title: 'New reply to your comment',
          message: `${comment.user.name || comment.user.email} replied to your comment`,
          commentId: comment.id,
          actionUrl: `/editor/${data.workflowId}?commentId=${comment.id}`,
        });
      }
    }

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'comment.created',
      workflowId: data.workflowId,
      userId: data.userId, // Add userId to skip sender
      data: comment,
    });

    return comment;
  }

  /**
   * Get comments for a workflow
   */
  async getComments(workflowId: string, options: {
    nodeId?: string;
    parentId?: string | null;
    includeReplies?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { nodeId, parentId, includeReplies = true, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowCommentWhereInput = {
      workflowId,
      ...(nodeId && { nodeId }),
      ...(parentId !== undefined && { parentId }),
    };

    const [comments, total] = await Promise.all([
      prisma.workflowComment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          ...(includeReplies && {
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          }),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowComment.count({ where }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await prisma.workflowComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized to update this comment');
    }

    // Extract new mentions
    const mentions = this.extractMentions(content);

    const updated = await prisma.workflowComment.update({
      where: { id: commentId },
      data: {
        content,
        mentions: mentions.length > 0 ? mentions : Prisma.DbNull,
        edited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'comment.updated',
      workflowId: comment.workflowId,
      userId: userId,
      data: updated,
    });

    return updated;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.workflowComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    await prisma.workflowComment.delete({
      where: { id: commentId },
    });

    // Create activity
    await this.createActivity({
      workflowId: comment.workflowId,
      userId,
      type: 'COMMENT_DELETED',
      action: 'comment.deleted',
      targetType: 'comment',
      targetId: commentId,
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'comment.deleted',
      workflowId: comment.workflowId,
      userId: userId,
      data: { commentId },
    });

    return { success: true };
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, userId: string) {
    const comment = await prisma.workflowComment.update({
      where: { id: commentId },
      data: {
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Notify comment author if different user resolved it
    if (comment.userId !== userId) {
      await this.createNotification({
        userId: comment.userId,
        workflowId: comment.workflowId,
        type: 'COMMENT_RESOLVED',
        title: 'Your comment was resolved',
        message: `Your comment was marked as resolved`,
        commentId: comment.id,
        actionUrl: `/editor/${comment.workflowId}?commentId=${comment.id}`,
      });
    }

    // Create activity
    await this.createActivity({
      workflowId: comment.workflowId,
      userId,
      type: 'COMMENT_RESOLVED',
      action: 'comment.resolved',
      targetType: 'comment',
      targetId: commentId,
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'comment.resolved',
      workflowId: comment.workflowId,
      userId: userId,
      data: comment,
    });

    return comment;
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(commentId: string, userId: string, emoji: string) {
    const comment = await prisma.workflowComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    const reactions = (comment.reactions as any[]) || [];
    const existingReaction = reactions.find((r: any) => r.emoji === emoji);

    if (existingReaction) {
      // Add user to existing reaction
      if (!existingReaction.userIds.includes(userId)) {
        existingReaction.userIds.push(userId);
      }
    } else {
      // Create new reaction
      reactions.push({
        emoji,
        userIds: [userId],
      });
    }

    const updated = await prisma.workflowComment.update({
      where: { id: commentId },
      data: { reactions },
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'comment.reaction_added',
      workflowId: comment.workflowId,
      userId: userId,
      data: { commentId, emoji, userId },
    });

    return updated;
  }

  // =========================================
  // ACTIVITY FEED
  // =========================================

  /**
   * Create an activity entry
   */
  async createActivity(data: {
    workflowId: string;
    userId?: string;
    type: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: any;
    changes?: any;
    batchId?: string;
  }) {
    const activity = await prisma.workflowActivity.create({
      data: {
        workflowId: data.workflowId,
        userId: data.userId,
        type: data.type as any,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        metadata: data.metadata || Prisma.DbNull,
        changes: data.changes || Prisma.DbNull,
        batchId: data.batchId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'activity.created',
      workflowId: data.workflowId,
      userId: data.userId,
      data: activity,
    });

    return activity;
  }

  /**
   * Get activity feed for a workflow
   */
  async getActivityFeed(workflowId: string, options: {
    page?: number;
    limit?: number;
    types?: string[];
  } = {}) {
    const { page = 1, limit = 50, types } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowActivityWhereInput = {
      workflowId,
      ...(types && types.length > 0 && { type: { in: types as any } }),
    };

    const [activities, total] = await Promise.all([
      prisma.workflowActivity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowActivity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================
  // NOTIFICATIONS
  // =========================================

  /**
   * Create a notification
   */
  async createNotification(data: {
    userId: string;
    workflowId: string;
    type: NotificationType;
    title: string;
    message: string;
    activityId?: string;
    commentId?: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const notification = await prisma.workflowNotification.create({
      data: {
        userId: data.userId,
        workflowId: data.workflowId,
        type: data.type,
        title: data.title,
        message: data.message,
        activityId: data.activityId,
        commentId: data.commentId,
        actionUrl: data.actionUrl,
        metadata: data.metadata || Prisma.DbNull,
      },
    });

    // Emit real-time event
    await this.emitRealtimeEvent('collaboration', {
      type: 'notification.created',
      userId: data.userId,
      data: notification,
    });

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, options: {
    workflowId?: string;
    read?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { workflowId, read, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowNotificationWhereInput = {
      userId,
      ...(workflowId && { workflowId }),
      ...(read !== undefined && { read }),
      dismissed: false,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.workflowNotification.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowNotification.count({ where }),
      prisma.workflowNotification.count({
        where: {
          userId,
          read: false,
          dismissed: false,
        },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string) {
    const notification = await prisma.workflowNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    return await prisma.workflowNotification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, workflowId?: string) {
    const where: Prisma.WorkflowNotificationWhereInput = {
      userId,
      read: false,
      ...(workflowId && { workflowId }),
    };

    await prisma.workflowNotification.updateMany({
      where,
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(notificationId: string, userId: string) {
    const notification = await prisma.workflowNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    return await prisma.workflowNotification.update({
      where: { id: notificationId },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
      },
    });
  }

  // =========================================
  // HELPER METHODS
  // =========================================

  /**
   * Extract @mentions from text (usernames, not IDs)
   * Format: @username
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    
    const mentions = new Set<string>();
    
    // Extract all @mentions
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.add(match[1]);
    }
    
    return Array.from(mentions);
  }

  /**
   * Handle @mentions - create notifications for mentioned users
   * Accepts usernames and looks up actual user IDs
   */
  private async handleMentions(
    usernames: string[],
    commentId: string,
    workflowId: string,
    mentioningUserId: string
  ) {
    const comment = await prisma.workflowComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!comment) return;

    // Look up users by email or name containing the username
    for (const username of usernames) {
      // Try to find user by email prefix or name
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: username, mode: 'insensitive' } },
            { name: { contains: username, mode: 'insensitive' } },
          ],
        },
        take: 1, // Only notify the first match
      });

      if (users.length === 0) continue;

      const user = users[0];
      
      // Don't notify the user who made the mention
      if (user.id === mentioningUserId) continue;

      await this.createNotification({
        userId: user.id,
        workflowId,
        type: 'MENTION',
        title: 'You were mentioned',
        message: `${comment.user.name || comment.user.email} mentioned you in a comment`,
        commentId,
        actionUrl: `/editor/${workflowId}?commentId=${commentId}`,
      });
    }
  }

  /**
   * Emit real-time event via Redis
   */
  private async emitRealtimeEvent(channel: string, data: any) {
    try {
      await redis.publish(
        'collaboration:events',
        JSON.stringify({
          channel,
          ...data,
        })
      );
    } catch (error) {
      console.error('[Collaboration] Failed to emit real-time event:', error);
    }
  }
}

export const collaborationService = new CollaborationService();
