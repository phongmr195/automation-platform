import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/monitoring`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authTokens = localStorage.getItem('authTokens');
  if (authTokens) {
    try {
      const { accessToken } = JSON.parse(authTokens);
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error('Failed to parse auth tokens:', error);
    }
  }
  return config;
});

// -------------------------------------------------------
// HEALTH CHECK API
// -------------------------------------------------------

export interface ComponentHealth {
  component: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  responseTime?: number;
  uptime?: number;
  errorMessage?: string;
  metadata?: any;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  components: ComponentHealth[];
  timestamp: string;
}

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await api.get('/health');
  return response.data.data;
};

export const getComponentHealth = async (
  component: string,
  startDate?: Date,
  endDate?: Date
) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  const response = await api.get(`/health/${component}?${params.toString()}`);
  return response.data.data;
};

// -------------------------------------------------------
// UPTIME MONITORING API
// -------------------------------------------------------

export interface UptimeMonitor {
  id: string;
  serviceName: string;
  serviceUrl?: string;
  serviceType: string;
  checkInterval: number;
  timeout: number;
  enabled: boolean;
  currentStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  lastStatusChange?: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  avgResponseTime: number;
  lastResponseTime?: number;
  lastCheckAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  incidents?: UptimeIncident[];
}

export interface UptimeIncident {
  id: string;
  monitorId: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  description?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  startedAt: string;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  duration?: number;
  affectedChecks: number;
  downtime: number;
  resolvedBy?: string;
  resolution?: string;
}

export interface UptimeCheck {
  id: string;
  monitorId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
  errorType?: string;
  metadata?: any;
  checkedAt: string;
}

export const createMonitor = async (data: {
  serviceName: string;
  serviceUrl?: string;
  serviceType: string;
  checkInterval?: number;
  timeout?: number;
}): Promise<UptimeMonitor> => {
  const response = await api.post('/monitors', data);
  return response.data.data;
};

export const getMonitors = async (): Promise<UptimeMonitor[]> => {
  const response = await api.get('/monitors');
  return response.data.data;
};

export const getMonitorStats = async (
  monitorId: string,
  days: number = 30
): Promise<{
  monitor: UptimeMonitor;
  checks: UptimeCheck[];
  incidents: UptimeIncident[];
  statistics: {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    uptimePercentage: number;
    avgResponseTime: number;
    totalIncidents: number;
    resolvedIncidents: number;
  };
}> => {
  const response = await api.get(`/monitors/${monitorId}?days=${days}`);
  return response.data.data;
};

export const performManualCheck = async (monitorId: string) => {
  const response = await api.post(`/monitors/${monitorId}/check`);
  return response.data.data;
};

export const acknowledgeIncident = async (
  monitorId: string,
  incidentId: string
) => {
  const response = await api.post(
    `/monitors/${monitorId}/incidents/${incidentId}/acknowledge`
  );
  return response.data.data;
};

export const resolveIncident = async (
  monitorId: string,
  incidentId: string,
  resolution: string
) => {
  const response = await api.post(
    `/monitors/${monitorId}/incidents/${incidentId}/resolve`,
    { resolution }
  );
  return response.data.data;
};

// -------------------------------------------------------
// PERFORMANCE METRICS API
// -------------------------------------------------------

export interface PerformanceMetric {
  id: string;
  metricName: string;
  metricType: 'GAUGE' | 'COUNTER' | 'HISTOGRAM' | 'SUMMARY';
  value: number;
  unit: string;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  endpoint?: string;
  min?: number;
  max?: number;
  avg?: number;
  p50?: number;
  p95?: number;
  p99?: number;
  count?: number;
  timestamp: string;
  windowStart?: string;
  windowEnd?: string;
  tags?: any;
}

export const recordMetric = async (data: {
  metricName: string;
  metricType: 'GAUGE' | 'COUNTER' | 'HISTOGRAM' | 'SUMMARY';
  value: number;
  unit: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  endpoint?: string;
  tags?: any;
}): Promise<PerformanceMetric> => {
  const response = await api.post('/metrics', data);
  return response.data.data;
};

export const getMetrics = async (
  metricName: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    workflowId?: string;
    executionId?: string;
    nodeId?: string;
    endpoint?: string;
  }
): Promise<PerformanceMetric[]> => {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('startDate', options.startDate.toISOString());
  if (options?.endDate) params.append('endDate', options.endDate.toISOString());
  if (options?.workflowId) params.append('workflowId', options.workflowId);
  if (options?.executionId) params.append('executionId', options.executionId);
  if (options?.nodeId) params.append('nodeId', options.nodeId);
  if (options?.endpoint) params.append('endpoint', options.endpoint);

  const response = await api.get(`/metrics/${metricName}?${params.toString()}`);
  return response.data.data;
};

export const getAggregatedMetrics = async (
  metricName: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'hour' | 'day' | 'week';
    workflowId?: string;
  }
) => {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('startDate', options.startDate.toISOString());
  if (options?.endDate) params.append('endDate', options.endDate.toISOString());
  if (options?.groupBy) params.append('groupBy', options.groupBy);
  if (options?.workflowId) params.append('workflowId', options.workflowId);

  const response = await api.get(
    `/metrics/${metricName}/aggregated?${params.toString()}`
  );
  return response.data.data;
};

// -------------------------------------------------------
// ERROR TRACKING API
// -------------------------------------------------------

export interface ErrorLog {
  id: string;
  errorType: string;
  errorCode?: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  stack?: string;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  environment?: string;
  version?: string;
  userAgent?: string;
  ipAddress?: string;
  fingerprint?: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export const logError = async (data: {
  errorType: string;
  errorCode?: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  stack?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  metadata?: any;
}): Promise<ErrorLog> => {
  const response = await api.post('/errors', data);
  return response.data.data;
};

export const getErrors = async (options?: {
  errorType?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  workflowId?: string;
  executionId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  errors: ErrorLog[];
  total: number;
  limit: number;
  offset: number;
}> => {
  const params = new URLSearchParams();
  if (options?.errorType) params.append('errorType', options.errorType);
  if (options?.severity) params.append('severity', options.severity);
  if (options?.resolved !== undefined) params.append('resolved', String(options.resolved));
  if (options?.startDate) params.append('startDate', options.startDate.toISOString());
  if (options?.endDate) params.append('endDate', options.endDate.toISOString());
  if (options?.workflowId) params.append('workflowId', options.workflowId);
  if (options?.executionId) params.append('executionId', options.executionId);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));

  const response = await api.get(`/errors?${params.toString()}`);
  return response.data;
};

export const getErrorStats = async (days: number = 7) => {
  const response = await api.get(`/errors/stats?days=${days}`);
  return response.data.data;
};

export const resolveError = async (errorId: string): Promise<ErrorLog> => {
  const response = await api.post(`/errors/${errorId}/resolve`);
  return response.data.data;
};

// -------------------------------------------------------
// APM TRACE API
// -------------------------------------------------------

export interface APMTrace {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
  statusCode?: number;
  error: boolean;
  errorMessage?: string;
  errorType?: string;
  tags?: any;
  logs?: any;
  serviceName?: string;
  serviceVersion?: string;
  createdAt: string;
}

export const startTrace = async (data: {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  tags?: any;
}): Promise<APMTrace> => {
  const response = await api.post('/traces', data);
  return response.data.data;
};

export const endTrace = async (
  traceId: string,
  spanId: string,
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'CANCELLED' = 'OK',
  error?: { message: string; type: string }
): Promise<APMTrace> => {
  const response = await api.put(`/traces/${traceId}/${spanId}`, {
    status,
    error,
  });
  return response.data.data;
};

export const getTrace = async (traceId: string) => {
  const response = await api.get(`/traces/${traceId}`);
  return response.data.data;
};

export const getExecutionTraces = async (executionId: string): Promise<APMTrace[]> => {
  const response = await api.get(`/traces/execution/${executionId}`);
  return response.data.data;
};

