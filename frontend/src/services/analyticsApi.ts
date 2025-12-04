/**
 * Analytics API Client
 * Provides methods to fetch analytics data from the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface DashboardData {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  activeWorkflows: number;
  totalWorkflows: number;
  totalNodes: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    storage: number;
  };
  recentExecutions: Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    duration: number | null;
  }>;
  executionTrend: Array<{
    date: string;
    successful: number;
    failed: number;
    total: number;
  }>;
  topWorkflows: Array<{
    id: string;
    name: string;
    executions: number;
    successRate: number;
    averageDuration: number;
  }>;
}

export interface ExecutionStats {
  period: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  executionsByDay: Array<{
    date: string;
    total: number;
    successful: number;
    failed: number;
  }>;
  executionsByHour: Array<{
    hour: number;
    total: number;
    successful: number;
    failed: number;
  }>;
}

export interface WorkflowMetric {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export interface ResourceMetrics {
  period: string;
  averageCpu: number;
  maxCpu: number;
  averageMemory: number;
  maxMemory: number;
  totalStorage: number;
  networkIn: number;
  networkOut: number;
  usageByDay: Array<{
    date: string;
    cpu: number;
    memory: number;
    storage: number;
  }>;
}

export interface CostAnalysis {
  period: string;
  totalCost: number;
  costByWorkflow: Array<{
    workflowId: string;
    workflowName: string;
    executionCost: number;
    storageCost: number;
    totalCost: number;
  }>;
  costTrend: Array<{
    date: string;
    cost: number;
  }>;
}

export class AnalyticsAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get dashboard overview data
   */
  async getDashboard(params?: {
    timeRange?: '24h' | '7d' | '30d' | '90d';
    organizationId?: string;
  }): Promise<DashboardData> {
    const query = new URLSearchParams();
    if (params?.timeRange) query.append('timeRange', params.timeRange);
    if (params?.organizationId) query.append('organizationId', params.organizationId);

    return this.request<DashboardData>(
      `/api/analytics/dashboard?${query.toString()}`
    );
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(params?: {
    timeRange?: '24h' | '7d' | '30d' | '90d';
    workflowId?: string;
    organizationId?: string;
  }): Promise<ExecutionStats> {
    const query = new URLSearchParams();
    if (params?.timeRange) query.append('timeRange', params.timeRange);
    if (params?.workflowId) query.append('workflowId', params.workflowId);
    if (params?.organizationId) query.append('organizationId', params.organizationId);

    return this.request<ExecutionStats>(
      `/api/analytics/execution-stats?${query.toString()}`
    );
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(params?: {
    timeRange?: '24h' | '7d' | '30d' | '90d';
    organizationId?: string;
  }): Promise<WorkflowMetric[]> {
    const query = new URLSearchParams();
    if (params?.timeRange) query.append('timeRange', params.timeRange);
    if (params?.organizationId) query.append('organizationId', params.organizationId);

    return this.request<WorkflowMetric[]>(
      `/api/analytics/workflow-metrics?${query.toString()}`
    );
  }

  /**
   * Get resource usage metrics
   */
  async getResourceMetrics(params?: {
    timeRange?: '24h' | '7d' | '30d' | '90d';
    organizationId?: string;
  }): Promise<ResourceMetrics> {
    const query = new URLSearchParams();
    if (params?.timeRange) query.append('timeRange', params.timeRange);
    if (params?.organizationId) query.append('organizationId', params.organizationId);

    return this.request<ResourceMetrics>(
      `/api/analytics/resource-metrics?${query.toString()}`
    );
  }

  /**
   * Get cost analysis
   */
  async getCostAnalysis(params?: {
    timeRange?: '24h' | '7d' | '30d' | '90d';
    organizationId?: string;
  }): Promise<CostAnalysis> {
    const query = new URLSearchParams();
    if (params?.timeRange) query.append('timeRange', params.timeRange);
    if (params?.organizationId) query.append('organizationId', params.organizationId);

    return this.request<CostAnalysis>(
      `/api/analytics/cost-analysis?${query.toString()}`
    );
  }

  /**
   * Export analytics data
   */
  async exportData(params: {
    format: 'csv' | 'json';
    type: 'executions' | 'workflows' | 'resources' | 'costs';
    timeRange?: '24h' | '7d' | '30d' | '90d';
    organizationId?: string;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    query.append('format', params.format);
    query.append('type', params.type);
    if (params.timeRange) query.append('timeRange', params.timeRange);
    if (params.organizationId) query.append('organizationId', params.organizationId);

    const response = await fetch(
      `${this.baseUrl}/api/analytics/export?${query.toString()}`,
      {
        headers: {
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.blob();
  }
}

// Export singleton instance
export const analyticsApi = new AnalyticsAPI();
