/**
 * Organization API Service
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authTokens = localStorage.getItem('authTokens');
  if (authTokens) {
    try {
      const tokens = JSON.parse(authTokens);
      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    } catch (error) {
      console.error('Failed to parse auth tokens:', error);
    }
  }
  return config;
});

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt?: string;
  _count?: {
    members: number;
    workflows: number;
  };
  members?: OrganizationMember[];
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
    verified?: boolean;
  };
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  description?: string;
}

export interface InviteMemberInput {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export const organizationApi = {
  // Organizations
  getOrganizations: async (): Promise<{ organizations: Organization[]; total: number }> => {
    const { data } = await api.get('/organizations');
    return data;
  },

  getOrganization: async (id: string): Promise<Organization> => {
    const { data } = await api.get(`/organizations/${id}`);
    return data;
  },

  createOrganization: async (input: CreateOrganizationInput): Promise<Organization> => {
    const { data } = await api.post('/organizations', input);
    return data;
  },

  updateOrganization: async (id: string, input: UpdateOrganizationInput): Promise<Organization> => {
    const { data } = await api.put(`/organizations/${id}`, input);
    return data;
  },

  deleteOrganization: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete(`/organizations/${id}`);
    return data;
  },

  // Members
  getMembers: async (organizationId: string): Promise<{ members: OrganizationMember[]; total: number }> => {
    const { data } = await api.get(`/organizations/${organizationId}/members`);
    return data;
  },

  inviteMember: async (organizationId: string, input: InviteMemberInput): Promise<OrganizationMember> => {
    const { data } = await api.post(`/organizations/${organizationId}/members`, input);
    return data;
  },

  updateMemberRole: async (
    organizationId: string,
    memberId: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  ): Promise<OrganizationMember> => {
    const { data } = await api.put(`/organizations/${organizationId}/members/${memberId}/role`, { role });
    return data;
  },

  removeMember: async (organizationId: string, memberId: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete(`/organizations/${organizationId}/members/${memberId}`);
    return data;
  },

  leaveOrganization: async (organizationId: string): Promise<{ success: boolean }> => {
    const { data } = await api.post(`/organizations/${organizationId}/leave`);
    return data;
  },

  // Audit Logs
  getAuditLogs: async (
    organizationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ logs: AuditLog[]; total: number; limit: number; offset: number }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const { data } = await api.get(`/organizations/${organizationId}/audit-logs?${params.toString()}`);
    return data;
  },
};
