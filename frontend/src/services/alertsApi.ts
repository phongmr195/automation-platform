/**
 * Alerts API Client
 * Provides methods to manage alert rules and channels
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type AlertTriggerType =
  | 'EXECUTION_FAILED'
  | 'EXECUTION_SLOW'
  | 'ERROR_RATE_HIGH'
  | 'SUCCESS_RATE_LOW'
  | 'SCHEDULE_MISSED'
  | 'RESOURCE_LIMIT'
  | 'COST_THRESHOLD'
  | 'CUSTOM';

export type AlertChannelType =
  | 'EMAIL'
  | 'SLACK'
  | 'WEBHOOK'
  | 'DISCORD'
  | 'TEAMS'
  | 'TELEGRAM';

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  organizationId: string;
  workflowId?: string;
  triggerType: AlertTriggerType;
  conditions: any;
  evaluationInterval: number;
  cooldownPeriod: number;
  lastTriggeredAt?: string;
  lastEvaluatedAt?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
  channels?: Array<{
    id: string;
    channel: AlertChannel;
  }>;
}

export interface AlertChannel {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  organizationId: string;
  type: AlertChannelType;
  config: any;
  lastUsedAt?: string;
  alertsSent: number;
  alertsFailed: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  workflowId?: string;
  executionId?: string;
  severity: AlertSeverity;
  message: string;
  details?: any;
  channelsSent: any;
  channelsFailed?: any;
  triggeredAt: string;
  resolvedAt?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt: string;
  rule?: AlertRule;
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  enabled?: boolean;
  organizationId: string;
  workflowId?: string;
  triggerType: AlertTriggerType;
  conditions: any;
  evaluationInterval?: number;
  cooldownPeriod?: number;
  channelIds: string[];
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  enabled?: boolean;
  organizationId: string;
  type: AlertChannelType;
  config: any;
}

export class AlertsAPI {
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
    // Get token from localStorage if not set
    let token = this.token;
    if (!token) {
      const authTokens = localStorage.getItem('authTokens');
      if (authTokens) {
        const parsedTokens = JSON.parse(authTokens);
        token = parsedTokens.accessToken;
      }
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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

  // -------------------------------------------------------
  // ALERT RULES
  // -------------------------------------------------------

  /**
   * Get all alert rules for an organization
   */
  async getRules(params: {
    organizationId: string;
    workflowId?: string;
  }): Promise<AlertRule[]> {
    const query = new URLSearchParams({ organizationId: params.organizationId });
    if (params.workflowId) query.append('workflowId', params.workflowId);

    return this.request<AlertRule[]>(`/alerts/rules?${query.toString()}`);
  }

  /**
   * Create a new alert rule
   */
  async createRule(input: CreateRuleInput): Promise<AlertRule> {
    return this.request<AlertRule>('/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Update an alert rule
   */
  async updateRule(
    ruleId: string,
    organizationId: string,
    updates: Partial<CreateRuleInput>
  ): Promise<AlertRule> {
    const query = new URLSearchParams({ organizationId });
    return this.request<AlertRule>(`/alerts/rules/${ruleId}?${query.toString()}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string, organizationId: string): Promise<void> {
    const query = new URLSearchParams({ organizationId });
    await this.request<{ success: boolean }>(
      `/alerts/rules/${ruleId}?${query.toString()}`,
      { method: 'DELETE' }
    );
  }

  // -------------------------------------------------------
  // ALERT CHANNELS
  // -------------------------------------------------------

  /**
   * Get all alert channels for an organization
   */
  async getChannels(params: {
    organizationId: string;
    type?: AlertChannelType;
  }): Promise<AlertChannel[]> {
    const query = new URLSearchParams({ organizationId: params.organizationId });
    if (params.type) query.append('type', params.type);

    return this.request<AlertChannel[]>(`/alerts/channels?${query.toString()}`);
  }

  /**
   * Create a new alert channel
   */
  async createChannel(input: CreateChannelInput): Promise<AlertChannel> {
    return this.request<AlertChannel>('/alerts/channels', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Update an alert channel
   */
  async updateChannel(
    channelId: string,
    organizationId: string,
    updates: Partial<CreateChannelInput>
  ): Promise<AlertChannel> {
    const query = new URLSearchParams({ organizationId });
    return this.request<AlertChannel>(
      `/alerts/channels/${channelId}?${query.toString()}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  /**
   * Delete an alert channel
   */
  async deleteChannel(channelId: string, organizationId: string): Promise<void> {
    const query = new URLSearchParams({ organizationId });
    await this.request<{ success: boolean}>(
      `/alerts/channels/${channelId}?${query.toString()}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Test an alert channel
   */
  async testChannel(channelId: string, organizationId: string): Promise<boolean> {
    const query = new URLSearchParams({ organizationId });
    const result = await this.request<{ success: boolean }>(
      `/alerts/channels/${channelId}/test?${query.toString()}`,
      { method: 'POST' }
    );
    return result.success;
  }

  // -------------------------------------------------------
  // ALERT HISTORY
  // -------------------------------------------------------

  /**
   * Get alert history
   */
  async getHistory(params: {
    organizationId: string;
    ruleId?: string;
    workflowId?: string;
    severity?: AlertSeverity;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AlertHistory[]> {
    const query = new URLSearchParams({ organizationId: params.organizationId });
    if (params.ruleId) query.append('ruleId', params.ruleId);
    if (params.workflowId) query.append('workflowId', params.workflowId);
    if (params.severity) query.append('severity', params.severity);
    if (params.startDate) query.append('startDate', params.startDate.toISOString());
    if (params.endDate) query.append('endDate', params.endDate.toISOString());

    return this.request<AlertHistory[]>(`/alerts/history?${query.toString()}`);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<AlertHistory> {
    return this.request<AlertHistory>(`/alerts/history/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  /**
   * Trigger an alert manually (for testing)
   */
  async triggerAlert(params: {
    ruleId: string;
    workflowId?: string;
    executionId?: string;
    severity: AlertSeverity;
    message: string;
    details?: any;
  }): Promise<AlertHistory> {
    return this.request<AlertHistory>('/alerts/trigger', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

// Export singleton instance
export const alertsApi = new AlertsAPI();
