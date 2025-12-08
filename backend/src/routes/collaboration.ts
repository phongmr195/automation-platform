import { Hono } from 'hono';
import { collaborationService } from '../services/collaborationService';
import type { CollaboratorPermission } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// =========================================
// COLLABORATORS
// =========================================

/**
 * GET /workflows/:workflowId/collaborators
 * Get all collaborators for a workflow
 */
app.get('/workflows/:workflowId/collaborators', async (c) => {
  try {
    const { workflowId } = c.req.param();
    const collaborators = await collaborationService.getCollaborators(workflowId);
    return c.json(collaborators);
  } catch (error: any) {
    console.error('[Collaboration API] Get collaborators error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /workflows/:workflowId/collaborators
 * Add a collaborator to a workflow
 */
app.post('/workflows/:workflowId/collaborators', async (c) => {
  try {
    const { workflowId } = c.req.param();
    const { userId, permission } = await c.req.json();
    const invitedBy = (c as any).get('userId') as string;

    if (!userId || !permission) {
      return c.json({ error: 'userId and permission are required' }, 400);
    }

    const collaborator = await collaborationService.addCollaborator({
      workflowId,
      userId,
      permission: permission as CollaboratorPermission,
      invitedBy,
    });

    return c.json(collaborator, 201);
  } catch (error: any) {
    console.error('[Collaboration API] Add collaborator error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /workflows/:workflowId/collaborators/:userId
 * Remove a collaborator from a workflow
 */
app.delete('/workflows/:workflowId/collaborators/:userId', async (c) => {
  try {
    const { workflowId, userId } = c.req.param();
    const removedBy = (c as any).get('userId') as string;

    const result = await collaborationService.removeCollaborator(workflowId, userId, removedBy);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Remove collaborator error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /workflows/:workflowId/collaborators/:userId/permission
 * Update collaborator permission
 */
app.put('/workflows/:workflowId/collaborators/:userId/permission', async (c) => {
  try {
    const { workflowId, userId } = c.req.param();
    const { permission } = await c.req.json();

    if (!permission) {
      return c.json({ error: 'permission is required' }, 400);
    }

    const collaborator = await collaborationService.updateCollaboratorPermission(
      workflowId,
      userId,
      permission as CollaboratorPermission
    );

    return c.json(collaborator);
  } catch (error: any) {
    console.error('[Collaboration API] Update permission error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /workflows/:workflowId/collaborators/:userId/presence
 * Update collaborator presence (cursor position, active status)
 */
app.post('/workflows/:workflowId/collaborators/:userId/presence', async (c) => {
  try {
    const { workflowId, userId } = c.req.param();
    const { cursorPosition, isActive } = await c.req.json();

    const collaborator = await collaborationService.updatePresence({
      workflowId,
      userId,
      cursorPosition,
      isActive: isActive !== undefined ? isActive : true,
    });

    return c.json(collaborator);
  } catch (error: any) {
    console.error('[Collaboration API] Update presence error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /workflows/:workflowId/collaborators/active
 * Get active collaborators (currently viewing the workflow)
 */
app.get('/workflows/:workflowId/collaborators/active', async (c) => {
  try {
    const { workflowId } = c.req.param();
    const active = await collaborationService.getActiveCollaborators(workflowId);
    return c.json(active);
  } catch (error: any) {
    console.error('[Collaboration API] Get active collaborators error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// =========================================
// COMMENTS
// =========================================

/**
 * GET /workflows/:workflowId/comments
 * Get comments for a workflow
 */
app.get('/workflows/:workflowId/comments', async (c) => {
  try {
    const { workflowId } = c.req.param();
    const query = c.req.query();

    const options = {
      nodeId: query.nodeId,
      parentId: query.parentId === 'null' ? null : query.parentId,
      includeReplies: query.includeReplies !== 'false',
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    };

    const result = await collaborationService.getComments(workflowId, options);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Get comments error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /workflows/:workflowId/comments
 * Create a comment on a workflow
 */
app.post('/workflows/:workflowId/comments', async (c) => {
  try {
    const { workflowId } = c.req.param();
    const userId = (c as any).get('userId') as string;
    const { content, nodeId, position, parentId } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: 'content is required' }, 400);
    }

    const comment = await collaborationService.createComment({
      workflowId,
      userId,
      content: content.trim(),
      nodeId,
      position,
      parentId,
    });

    return c.json(comment, 201);
  } catch (error: any) {
    console.error('[Collaboration API] Create comment error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /comments/:commentId
 * Update a comment
 */
app.put('/comments/:commentId', async (c) => {
  try {
    const { commentId } = c.req.param();
    const userId = (c as any).get('userId') as string;
    const { content } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: 'content is required' }, 400);
    }

    const comment = await collaborationService.updateComment(commentId, userId, content.trim());
    return c.json(comment);
  } catch (error: any) {
    console.error('[Collaboration API] Update comment error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /comments/:commentId
 * Delete a comment
 */
app.delete('/comments/:commentId', async (c) => {
  try {
    const { commentId } = c.req.param();
    const userId = (c as any).get('userId') as string;

    const result = await collaborationService.deleteComment(commentId, userId);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Delete comment error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /comments/:commentId/resolve
 * Resolve a comment
 */
app.post('/comments/:commentId/resolve', async (c) => {
  try {
    const { commentId } = c.req.param();
    const userId = (c as any).get('userId') as string;

    const comment = await collaborationService.resolveComment(commentId, userId);
    return c.json(comment);
  } catch (error: any) {
    console.error('[Collaboration API] Resolve comment error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /comments/:commentId/reactions
 * Add a reaction to a comment
 */
app.post('/comments/:commentId/reactions', async (c) => {
  try {
    const { commentId } = c.req.param();
    const userId = (c as any).get('userId') as string;
    const { emoji } = await c.req.json();

    if (!emoji) {
      return c.json({ error: 'emoji is required' }, 400);
    }

    const comment = await collaborationService.addReaction(commentId, userId, emoji);
    return c.json(comment);
  } catch (error: any) {
    console.error('[Collaboration API] Add reaction error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// =========================================
// ACTIVITY FEED
// =========================================

/**
 * GET /workflows/:workflowId/activity
 * Get activity feed for a workflow
 */
app.get('/workflows/:workflowId/activity', async (c) => {
  try {
    const { workflowId } = c.req.param();
    const query = c.req.query();

    const options = {
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
      types: query.types ? query.types.split(',') : undefined,
    };

    const result = await collaborationService.getActivityFeed(workflowId, options);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Get activity feed error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// =========================================
// NOTIFICATIONS
// =========================================

/**
 * GET /notifications
 * Get notifications for current user
 */
app.get('/notifications', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const query = c.req.query();

    const options = {
      workflowId: query.workflowId,
      read: query.read === 'true' ? true : query.read === 'false' ? false : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    };

    const result = await collaborationService.getUserNotifications(userId, options);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Get notifications error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /notifications/:notificationId/read
 * Mark notification as read
 */
app.put('/notifications/:notificationId/read', async (c) => {
  try {
    const { notificationId } = c.req.param();
    const userId = (c as any).get('userId') as string;

    const notification = await collaborationService.markNotificationAsRead(notificationId, userId);
    return c.json(notification);
  } catch (error: any) {
    console.error('[Collaboration API] Mark notification as read error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /notifications/read-all
 * Mark all notifications as read
 */
app.post('/notifications/read-all', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const { workflowId } = await c.req.json();

    const result = await collaborationService.markAllAsRead(userId, workflowId);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Mark all as read error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /notifications/:notificationId
 * Dismiss a notification
 */
app.delete('/notifications/:notificationId', async (c) => {
  try {
    const { notificationId } = c.req.param();
    const userId = (c as any).get('userId') as string;

    const result = await collaborationService.dismissNotification(notificationId, userId);
    return c.json(result);
  } catch (error: any) {
    console.error('[Collaboration API] Dismiss notification error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
