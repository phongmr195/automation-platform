/**
 * API Service for backend communication
 */

import axios from 'axios';
import type { Workflow, NodeDefinition, ExecutionResult } from '../types/workflow';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const engineApi = axios.create({
  baseURL: '/api/engine',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const workflowApi = {
  // Nodes
  getNodes: async (): Promise<{ nodes: NodeDefinition[]; total: number }> => {
    const { data } = await engineApi.get('/nodes');
    return data;
  },

  // Workflows
  getWorkflows: async (): Promise<{ workflows: Workflow[]; total: number }> => {
    const { data } = await api.get('/workflows');
    return data;
  },

  getWorkflow: async (id: string): Promise<Workflow> => {
    const { data } = await api.get(`/workflows/${id}`);
    return data;
  },

  createWorkflow: async (workflow: Partial<Workflow>): Promise<{ message: string; workflow: Workflow }> => {
    const { data } = await api.post('/workflows', workflow);
    return data;
  },

  updateWorkflow: async (id: string, workflow: Partial<Workflow>): Promise<{ message: string; workflow: Workflow }> => {
    const { data } = await api.put(`/workflows/${id}`, workflow);
    return data;
  },

  deleteWorkflow: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/workflows/${id}`);
    return data;
  },

  // Execution
  executeWorkflow: async (id: string, triggerData?: unknown): Promise<{ message: string; execution: ExecutionResult }> => {
    const { data } = await api.post(`/workflows/${id}/execute`, { triggerData });
    return data;
  },

  getExecution: async (executionId: string): Promise<ExecutionResult> => {
    const { data} = await engineApi.get(`/executions/${executionId}`);
    return data;
  },

  // Activation
  activateWorkflow: async (id: string): Promise<{ message: string; workflow: Workflow }> => {
    const { data } = await engineApi.post(`/workflows/${id}/activate`);
    return data;
  },

  deactivateWorkflow: async (id: string): Promise<{ message: string; workflow: Workflow }> => {
    const { data } = await engineApi.post(`/workflows/${id}/deactivate`);
    return data;
  },

  // Schedules
  getSchedules: async (): Promise<{ schedules: unknown[]; stats: unknown }> => {
    const { data } = await engineApi.get('/schedules');
    return data;
  },

  // Workflow Management
  toggleStar: async (id: string): Promise<{ id: string; starred: boolean }> => {
    const { data } = await api.post(`/workflows/${id}/star`);
    return data;
  },

  duplicateWorkflow: async (id: string): Promise<Workflow> => {
    const { data } = await api.post(`/workflows/${id}/duplicate`);
    return data;
  },

  exportWorkflows: async (workflowIds: string[]): Promise<unknown> => {
    const { data } = await api.post('/workflows/export', { workflowIds });
    return data;
  },

  importWorkflows: async (importData: unknown): Promise<{ imported: number; workflows: Workflow[] }> => {
    const { data } = await api.post('/workflows/import', importData);
    return data;
  },

  // Folders
  getFolders: async (organizationId?: string): Promise<Array<{ id: string; name: string; workflowCount: number }>> => {
    const params = organizationId ? `?organizationId=${organizationId}` : '';
    const { data } = await api.get(`/workflows/folders/list${params}`);
    return data;
  },

  createFolder: async (name: string, organizationId?: string): Promise<{ id: string; name: string }> => {
    const { data } = await api.post('/workflows/folders', { name, organizationId });
    return data;
  },

  moveToFolder: async (workflowId: string, folderId: string | null): Promise<Workflow> => {
    const { data } = await api.put(`/workflows/${workflowId}/folder`, { folderId });
    return data;
  },
};

export default api;
