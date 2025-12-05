import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with auth interceptor
const schedulesApiClient = axios.create({
  baseURL: `${API_URL}/schedules`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
schedulesApiClient.interceptors.request.use((config) => {
  const authTokens = localStorage.getItem('authTokens');
  if (authTokens) {
    const tokens = JSON.parse(authTokens);
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }
  return config;
});

export interface ScheduleConfig {
  id: string;
  workflowId: string;
  cronExpression: string;
  enabled: boolean;
  timezone: string;
  skipHolidays: boolean;
  holidayAction: 'SKIP' | 'DELAY_TO_NEXT' | 'EXECUTE';
  holidayCalendarId?: string;
  businessHoursOnly: boolean;
  businessHoursConfig?: Record<string, { start: string; end: string }>;
  maxExecutionsPerHour?: number;
  maxExecutionsPerDay?: number;
  queueStrategy: 'FIFO' | 'LIFO' | 'PRIORITY' | 'ROUND_ROBIN';
  maxQueueSize?: number;
  priority: number;
  maxConcurrent: number;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayCalendar {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  isPublic: boolean;
  holidays?: Holiday[];
}

export interface Holiday {
  id: string;
  calendarId: string;
  name: string;
  date: string;
  isRecurring: boolean;
  recurrenceRule?: any;
}

export interface ScheduleException {
  id: string;
  scheduleId: string;
  type: 'ONE_TIME' | 'RECURRING' | 'DATE_RANGE';
  startDate: string;
  endDate?: string;
  action: 'SKIP' | 'RESCHEDULE' | 'DELAY';
  alternativeCron?: string;
  reason?: string;
}

export interface ScheduleLog {
  id: string;
  scheduleId: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'SCHEDULED' | 'EXECUTED' | 'SKIPPED' | 'DELAYED' | 'FAILED' | 'CANCELLED' | 'QUEUED';
  skippedReason?: string;
  delayedBy?: number;
  executionId?: string;
  queuePosition?: number;
  queueWaitTime?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface Timezone {
  value: string;
  label: string;
}

export const schedulesApi = {
  // Schedule Config
  async createScheduleConfig(workflowId: string, data: Partial<ScheduleConfig>) {
    const response = await schedulesApiClient.post(`/${workflowId}`, data);
    return response.data;
  },

  async getScheduleConfig(workflowId: string) {
    const response = await schedulesApiClient.get(`/${workflowId}`);
    return response.data;
  },

  async deleteScheduleConfig(workflowId: string) {
    const response = await schedulesApiClient.delete(`/${workflowId}`);
    return response.data;
  },

  // Holiday Calendars
  async createHolidayCalendar(data: {
    name: string;
    description?: string;
    timezone?: string;
    isPublic?: boolean;
  }) {
    const response = await schedulesApiClient.post('/calendars', data);
    return response.data;
  },

  async addHoliday(calendarId: string, data: {
    name: string;
    date: string;
    isRecurring?: boolean;
    recurrenceRule?: any;
  }) {
    const response = await schedulesApiClient.post(`/calendars/${calendarId}/holidays`, data);
    return response.data;
  },

  // Exceptions
  async addException(workflowId: string, data: {
    type: 'ONE_TIME' | 'RECURRING' | 'DATE_RANGE';
    startDate: string;
    endDate?: string;
    action: 'SKIP' | 'RESCHEDULE' | 'DELAY';
    alternativeCron?: string;
    reason?: string;
  }) {
    const response = await schedulesApiClient.post(`/${workflowId}/exceptions`, data);
    return response.data;
  },

  // History
  async getScheduleHistory(workflowId: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await schedulesApiClient.get(`/${workflowId}/history`, { params });
    return response.data;
  },

  // Utilities
  async getTimezones(): Promise<{ success: boolean; data: Timezone[] }> {
    const response = await schedulesApiClient.get('/timezones');
    return response.data;
  },

  async testSchedule(workflowId: string, testTime?: string) {
    const response = await schedulesApiClient.post(`/${workflowId}/test`, { testTime });
    return response.data;
  },
};
