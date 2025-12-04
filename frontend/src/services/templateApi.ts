import axios from 'axios';
import type { WorkflowTemplate } from '../types/workflow';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    const response = await axios.get(`${API_URL}/templates`, { params });
    return response.data.templates || response.data;
  },

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<WorkflowTemplate[]> {
    const response = await axios.get(`${API_URL}/templates/featured`);
    return response.data.templates || response.data;
  },

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]> {
    const response = await axios.get(`${API_URL}/templates`, {
      params: { category },
    });
    return response.data.templates || response.data;
  },

  /**
   * Get all categories with counts
   */
  async getCategories(): Promise<Record<string, number>> {
    const response = await axios.get(`${API_URL}/templates/categories`);
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
    const response = await axios.get(`${API_URL}/templates/tags`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    const response = await axios.get(`${API_URL}/templates/search`, {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<WorkflowTemplate> {
    const response = await axios.get(`${API_URL}/templates/${id}`);
    return response.data;
  },

  /**
   * Create new template (admin only)
   */
  async createTemplate(data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const response = await axios.post(`${API_URL}/templates`, data);
    return response.data;
  },

  /**
   * Update template (admin only)
   */
  async updateTemplate(id: string, data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const response = await axios.put(`${API_URL}/templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete template (admin only)
   */
  async deleteTemplate(id: string): Promise<void> {
    await axios.delete(`${API_URL}/templates/${id}`);
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
    const response = await axios.post(`${API_URL}/templates/${id}/install`, data);
    return response.data;
  },

  /**
   * Rate a template
   */
  async rateTemplate(id: string, rating: number): Promise<{ averageRating: number }> {
    const response = await axios.post(`${API_URL}/templates/${id}/rate`, { rating });
    return response.data;
  },
};
