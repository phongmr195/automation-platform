import api from './api';

export type CollaboratorPermission = 'VIEW' | 'COMMENT' | 'EDIT';
export type NotificationType = 
  | 'MENTION'
  | 'COMMENT_REPLY'
  | 'COMMENT_RESOLVED'
  | 'WORKFLOW_SHARED'
  | 'WORKFLOW_UPDATED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_SUCCESS'
  | 'COLLABORATOR_JOINED';

export interface User {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

export interface Collaborator {
  id: string;
  workflowId: string;
  userId: string;
  user: User;
  permission: CollaboratorPermission;
  lastSeenAt: string | null;
  cursorPosition: { x: number; y: number; nodeId?: string } | null;
  isActive: boolean;
  invitedBy: string | null;
  invitedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowComment {
  id: string;
  workflowId: string;
  userId: string;
  user: User;
  content: string;
  nodeId: string | null;
  position: { x: number; y: number } | null;
  parentId: string | null;
  replies?: WorkflowComment[];
  mentions: string[] | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  reactions: Array<{ emoji: string; userIds: string[] }> | null;
  edited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowActivity {
  id: string;
  workflowId: string;
  userId: string | null;
  user: User | null;
  type: string;
  activityType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: any;
  changes: any;
  batchId: string | null;
  createdAt: string;
}

export interface WorkflowNotification {
  id: string;
  userId: string;
  workflowId: string;
  workflow: {
    id: string;
    name: string;
  };
  type: NotificationType;
  notificationType: NotificationType;
  title: string;
  message: string;
  content: string;
  activityId: string | null;
  commentId: string | null;
  actionUrl: string | null;
  metadata: any;
  read: boolean;
  isRead: boolean;
  readAt: string | null;
  dismissed: boolean;
  dismissedAt: string | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

class CollaborationAPI {
  // =========================================
  // COLLABORATORS
  // =========================================

  async getCollaborators(workflowId: string) {
    const response = await api.get(`/collaboration/workflows/${workflowId}/collaborators`);
    return response.data as Collaborator[];
  }

  async addCollaborator(workflowId: string, data: {
    userId: string;
    permission: CollaboratorPermission;
  }) {
    const response = await api.post(
      `/collaboration/workflows/${workflowId}/collaborators`,
      data
    );
    return response.data as Collaborator;
  }

  async removeCollaborator(workflowId: string, userId: string) {
    const response = await api.delete(
      `/collaboration/workflows/${workflowId}/collaborators/${userId}`
    );
    return response.data;
  }

  async updateCollaboratorPermission(
    workflowId: string,
    userId: string,
    permission: CollaboratorPermission
  ) {
    const response = await api.put(
      `/collaboration/workflows/${workflowId}/collaborators/${userId}/permission`,
      { permission }
    );
    return response.data as Collaborator;
  }

  async updatePresence(
    workflowId: string,
    userId: string,
    data: {
      cursorPosition?: { x: number; y: number; nodeId?: string } | null;
      isActive: boolean;
    }
  ) {
    const response = await api.post(
      `/collaboration/workflows/${workflowId}/collaborators/${userId}/presence`,
      data
    );
    return response.data as Collaborator;
  }

  async getActiveCollaborators(workflowId: string) {
    const response = await api.get(
      `/collaboration/workflows/${workflowId}/collaborators/active`
    );
    return response.data as Collaborator[];
  }

  // =========================================
  // COMMENTS
  // =========================================

  async getComments(workflowId: string, params?: {
    nodeId?: string;
    parentId?: string | null;
    includeReplies?: boolean;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.nodeId) searchParams.append('nodeId', params.nodeId);
    if (params?.parentId !== undefined) {
      searchParams.append('parentId', params.parentId === null ? 'null' : params.parentId);
    }
    if (params?.includeReplies !== undefined) {
      searchParams.append('includeReplies', params.includeReplies.toString());
    }
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get(
      `/collaboration/workflows/${workflowId}/comments?${searchParams.toString()}`
    );
    return response.data as {
      comments: WorkflowComment[];
      pagination: PaginationMeta;
    };
  }

  async createComment(workflowId: string, data: {
    content: string;
    nodeId?: string;
    position?: { x: number; y: number };
    parentId?: string;
  }) {
    const response = await api.post(
      `/collaboration/workflows/${workflowId}/comments`,
      data
    );
    return response.data as WorkflowComment;
  }

  async updateComment(commentId: string, content: string) {
    const response = await api.put(`/collaboration/comments/${commentId}`, {
      content,
    });
    return response.data as WorkflowComment;
  }

  async deleteComment(commentId: string) {
    const response = await api.delete(`/collaboration/comments/${commentId}`);
    return response.data;
  }

  async resolveComment(commentId: string) {
    const response = await api.post(`/collaboration/comments/${commentId}/resolve`);
    return response.data as WorkflowComment;
  }

  async addReaction(commentId: string, emoji: string) {
    const response = await api.post(`/collaboration/comments/${commentId}/reactions`, {
      emoji,
    });
    return response.data as WorkflowComment;
  }

  // =========================================
  // ACTIVITY FEED
  // =========================================

  async getActivityFeed(workflowId: string, params?: {
    page?: number;
    limit?: number;
    types?: string[];
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.types && params.types.length > 0) {
      searchParams.append('types', params.types.join(','));
    }

    const response = await api.get(
      `/collaboration/workflows/${workflowId}/activity?${searchParams.toString()}`
    );
    return response.data as {
      activities: WorkflowActivity[];
      pagination: PaginationMeta;
    };
  }

  // =========================================
  // NOTIFICATIONS
  // =========================================

  async getNotifications(params?: {
    workflowId?: string;
    read?: boolean;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.workflowId) searchParams.append('workflowId', params.workflowId);
    if (params?.read !== undefined) searchParams.append('read', params.read.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get(
      `/collaboration/notifications?${searchParams.toString()}`
    );
    return response.data as {
      notifications: WorkflowNotification[];
      unreadCount: number;
      pagination: PaginationMeta;
    };
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await api.put(
      `/collaboration/notifications/${notificationId}/read`
    );
    return response.data as WorkflowNotification;
  }

  async markAllAsRead(workflowId?: string) {
    const response = await api.post('/collaboration/notifications/read-all', {
      workflowId,
    });
    return response.data;
  }

  async dismissNotification(notificationId: string) {
    const response = await api.delete(
      `/collaboration/notifications/${notificationId}`
    );
    return response.data;
  }
}

export const collaborationApi = new CollaborationAPI();
