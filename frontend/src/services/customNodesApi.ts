/**
 * Custom Nodes API Client
 * Frontend service for interacting with custom nodes API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CustomNode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: string;
  authorName: string;
  category: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  status: string;
  published: boolean;
  featured: boolean;
  verified: boolean;
  repository?: string;
  homepage?: string;
  license?: string;
  keywords: string[];
  downloads: number;
  installs: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CustomNodeVersion {
  id: string;
  nodeId: string;
  version: string;
  changelog?: string;
  code: string;
  compiled?: string;
  dependencies?: Record<string, string>;
  definition: any;
  properties: any[];
  credentials?: any[];
  documentation?: any;
  validated: boolean;
  validationErrors?: string;
  downloads: number;
  createdAt: string;
  publishedAt?: string;
}

export interface NodeSearchParams {
  query?: string;
  category?: string;
  published?: boolean;
  featured?: boolean;
  verified?: boolean;
  sortBy?: 'downloads' | 'rating' | 'recent' | 'name';
  page?: number;
  limit?: number;
}

export interface CreateNodeInput {
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  repository?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
}

export interface CreateVersionInput {
  version: string;
  changelog?: string;
  code: string;
  dependencies?: Record<string, string>;
}

class CustomNodesApi {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }
  
  /**
   * Search custom nodes
   */
  async searchNodes(params: NodeSearchParams = {}) {
    const response = await axios.get(`${API_BASE_URL}/custom-nodes`, {
      params,
      ...this.getAuthHeaders()
    });
    return response.data;
  }
  
  /**
   * Get featured nodes
   */
  async getFeaturedNodes(limit = 10) {
    const response = await axios.get(`${API_BASE_URL}/custom-nodes/featured`, {
      params: { limit },
      ...this.getAuthHeaders()
    });
    return response.data.nodes;
  }
  
  /**
   * Get trending nodes
   */
  async getTrendingNodes(limit = 10) {
    const response = await axios.get(`${API_BASE_URL}/custom-nodes/trending`, {
      params: { limit },
      ...this.getAuthHeaders()
    });
    return response.data.nodes;
  }
  
  /**
   * Get installed nodes
   */
  async getInstalledNodes(organizationId?: string) {
    const response = await axios.get(`${API_BASE_URL}/custom-nodes/installed`, {
      params: { organizationId },
      ...this.getAuthHeaders()
    });
    return response.data.nodes;
  }
  
  /**
   * Get node by ID
   */
  async getNode(id: string, includeVersions = false) {
    const response = await axios.get(`${API_BASE_URL}/custom-nodes/${id}`, {
      params: { includeVersions },
      ...this.getAuthHeaders()
    });
    return response.data.node;
  }
  
  /**
   * Get node statistics
   */
  async getNodeStats(id: string) {
    const response = await axios.get(`${API_BASE_URL}/custom-nodes/${id}/stats`, {
      ...this.getAuthHeaders()
    });
    return response.data.stats;
  }
  
  /**
   * Create a new custom node
   */
  async createNode(input: CreateNodeInput) {
    const response = await axios.post(`${API_BASE_URL}/custom-nodes`, input, {
      ...this.getAuthHeaders()
    });
    return response.data.node;
  }
  
  /**
   * Create a new version
   */
  async createVersion(nodeId: string, input: CreateVersionInput) {
    const response = await axios.post(
      `${API_BASE_URL}/custom-nodes/${nodeId}/versions`,
      input,
      this.getAuthHeaders()
    );
    return response.data.version;
  }
  
  /**
   * Publish a node
   */
  async publishNode(nodeId: string, version: string) {
    const response = await axios.post(
      `${API_BASE_URL}/custom-nodes/${nodeId}/publish`,
      { version },
      this.getAuthHeaders()
    );
    return response.data.node;
  }
  
  /**
   * Install a node
   */
  async installNode(nodeId: string, version: string, organizationId?: string) {
    const response = await axios.post(
      `${API_BASE_URL}/custom-nodes/${nodeId}/install`,
      { nodeId, version, organizationId },
      this.getAuthHeaders()
    );
    return response.data.install;
  }
  
  /**
   * Uninstall a node
   */
  async uninstallNode(nodeId: string, organizationId?: string) {
    const response = await axios.delete(
      `${API_BASE_URL}/custom-nodes/${nodeId}/install`,
      {
        params: { organizationId },
        ...this.getAuthHeaders()
      }
    );
    return response.data;
  }
  
  /**
   * Update node metadata
   */
  async updateNode(nodeId: string, data: Partial<CreateNodeInput>) {
    const response = await axios.put(
      `${API_BASE_URL}/custom-nodes/${nodeId}`,
      data,
      this.getAuthHeaders()
    );
    return response.data.node;
  }
  
  /**
   * Delete (deprecate) a node
   */
  async deleteNode(nodeId: string) {
    const response = await axios.delete(
      `${API_BASE_URL}/custom-nodes/${nodeId}`,
      this.getAuthHeaders()
    );
    return response.data.node;
  }
  
  /**
   * Get loader stats
   */
  async getLoaderStats() {
    const response = await axios.get(
      `${API_BASE_URL}/custom-nodes/loader/stats`,
      this.getAuthHeaders()
    );
    return response.data;
  }
  
  /**
   * Clear loader cache
   */
  async clearCache(name?: string, version?: string) {
    const response = await axios.post(
      `${API_BASE_URL}/custom-nodes/loader/clear-cache`,
      { name, version },
      this.getAuthHeaders()
    );
    return response.data;
  }
}

export const customNodesApi = new CustomNodesApi();
