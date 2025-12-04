import axios from 'axios';
import type { WorkflowTemplate } from '../types/workflow';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with auth interceptor
const templateApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
templateApiClient.interceptors.request.use((config) => {
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

export const templateApi = {
  /**
   * Get all templates with optional filters
   */
  async getTemplates(params?: {
    category?: string;
    tags?: string[];
    difficulty?: string;
    featured?: boolean;
  }): Promise<WorkflowTemplate[]> {
    const response = await templateApiClient.get('/templates', { params });
    return response.data.templates || response.data;
  },

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<WorkflowTemplate[]> {
    const response = await templateApiClient.get('/templates/featured');
    return response.data.templates || response.data;
  },

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]> {
    const response = await templateApiClient.get('/templates', {
      params: { category },
    });
    return response.data.templates || response.data;
  },

  /**
   * Get all categories with counts
   */
  async getCategories(): Promise<Record<string, number>> {
    const response = await templateApiClient.get('/templates/categories');
    const categories = response.data.categories || [];
    const result: Record<string, number> = { all: 0 };
    
    categories.forEach((cat: { category: string; count: number }) => {
      result[cat.category] = cat.count;
      result.all += cat.count;
    });
    
    return result;
  },

  /**
   * Get popular tags
   */
  async getTags(limit?: number): Promise<string[]> {
    const response = await templateApiClient.get('/templates/tags', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    const response = await templateApiClient.get('/templates/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<WorkflowTemplate> {
    const response = await templateApiClient.get(`/templates/${id}`);
    return response.data;
  },

  /**
   * Create new template (admin only)
   */
  async createTemplate(data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const response = await templateApiClient.post('/templates', data);
    return response.data;
  },

  /**
   * Update template (admin only)
   */
  async updateTemplate(id: string, data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const response = await templateApiClient.put(`/templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete template (admin only)
   */
  async deleteTemplate(id: string): Promise<void> {
    await templateApiClient.delete(`/templates/${id}`);
  },

  /**
   * Install template - creates a new workflow from template
   */
  async installTemplate(
    id: string,
    data: {
      name: string;
      description?: string;
      organizationId: string;
      userId: string;
      parameterValues?: Record<string, any>;
    }
  ): Promise<{ workflowId: string }> {
    const response = await templateApiClient.post(`/templates/${id}/install`, data);
    return response.data;
  },

  /**
   * Rate a template
   */
  async rateTemplate(id: string, rating: number): Promise<{ averageRating: number }> {
    const response = await templateApiClient.post(`/templates/${id}/rate`, { rating });
    return response.data;
  },
};
