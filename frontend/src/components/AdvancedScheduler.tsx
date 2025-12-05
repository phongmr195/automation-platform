import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../services/schedulesApi';
import type { ScheduleConfig } from '../services/schedulesApi';
import { toast } from 'sonner';
import TimezoneSelector from './scheduling/TimezoneSelector';
import BusinessHoursEditor from './scheduling/BusinessHoursEditor';
import RateLimitConfig from './scheduling/RateLimitConfig';
import ScheduleHistory from './scheduling/ScheduleHistory';
import { Calendar, Clock, Shield, TrendingUp, History } from 'lucide-react';

interface AdvancedSchedulerProps {
  workflowId: string;
  onClose?: () => void;
}

export default function AdvancedScheduler({ workflowId, onClose }: AdvancedSchedulerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'basic' | 'business-hours' | 'holidays' | 'limits' | 'history'>('basic');

  // Form state
  const [cronExpression, setCronExpression] = useState('0 9 * * 1-5');
  const [enabled, setEnabled] = useState(true);
  const [timezone, setTimezone] = useState('UTC');
  const [skipHolidays, setSkipHolidays] = useState(false);
  const [holidayAction, setHolidayAction] = useState<'SKIP' | 'DELAY_TO_NEXT' | 'EXECUTE'>('SKIP');
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [businessHoursConfig, setBusinessHoursConfig] = useState<Record<string, { start: string; end: string }>>({
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
  });
  const [maxExecutionsPerHour, setMaxExecutionsPerHour] = useState<number | undefined>();
  const [maxExecutionsPerDay, setMaxExecutionsPerDay] = useState<number | undefined>();
  const [queueStrategy, setQueueStrategy] = useState<'FIFO' | 'LIFO' | 'PRIORITY' | 'ROUND_ROBIN'>('FIFO');
  const [priority, setPriority] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(1);

  // Fetch existing config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['schedule-config', workflowId],
    queryFn: () => schedulesApi.getScheduleConfig(workflowId),
    retry: false,
  });

  // Load existing config
  useEffect(() => {
    if (configData?.data) {
      const config: ScheduleConfig = configData.data;
      setCronExpression(config.cronExpression || '0 9 * * 1-5');
      setEnabled(config.enabled ?? true);
      setTimezone(config.timezone || 'UTC');
      setSkipHolidays(config.skipHolidays ?? false);
      setHolidayAction(config.holidayAction || 'SKIP');
      setBusinessHoursOnly(config.businessHoursOnly ?? false);
      if (config.businessHoursConfig) {
        setBusinessHoursConfig(config.businessHoursConfig as any);
      }
      setMaxExecutionsPerHour(config.maxExecutionsPerHour);
      setMaxExecutionsPerDay(config.maxExecutionsPerDay);
      setQueueStrategy(config.queueStrategy || 'FIFO');
      setPriority(config.priority ?? 0);
      setMaxConcurrent(config.maxConcurrent ?? 1);
    }
  }, [configData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => schedulesApi.createScheduleConfig(workflowId, {
      cronExpression,
      enabled,
      timezone,
      skipHolidays,
      holidayAction,
      businessHoursOnly,
      businessHoursConfig: businessHoursOnly ? businessHoursConfig : undefined,
      maxExecutionsPerHour,
      maxExecutionsPerDay,
      queueStrategy,
      priority,
      maxConcurrent,
    }),
    onSuccess: () => {
      toast.success('Schedule configuration saved');
      queryClient.invalidateQueries({ queryKey: ['schedule-config', workflowId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.deleteScheduleConfig(workflowId),
    onSuccess: () => {
      toast.success('Schedule deleted');
      queryClient.invalidateQueries({ queryKey: ['schedule-config', workflowId] });
      onClose?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete schedule');
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-semibold">Advanced Schedule Configuration</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure timezone, business hours, holidays, and rate limits
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-1 px-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Basic Settings
            </div>
          </button>
          <button
            onClick={() => setActiveTab('business-hours')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'business-hours'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Business Hours
            </div>
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'holidays'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Holidays
            </div>
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'limits'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Rate Limits
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Basic Settings Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Schedule Enabled</label>
                <p className="text-sm text-gray-600">
                  Enable or disable this schedule
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Cron Expression */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cron Expression
              </label>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: 0 9 * * 1-5 (Every weekday at 9 AM)
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <TimezoneSelector
                value={timezone}
                onChange={setTimezone}
              />
            </div>

            {/* Queue Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Queue Strategy
              </label>
              <select
                value={queueStrategy}
                onChange={(e) => setQueueStrategy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FIFO">FIFO (First In, First Out)</option>
                <option value="LIFO">LIFO (Last In, First Out)</option>
                <option value="PRIORITY">Priority-based</option>
                <option value="ROUND_ROBIN">Round Robin</option>
              </select>
            </div>

            {/* Priority (if queue strategy is PRIORITY) */}
            {queueStrategy === 'PRIORITY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority (0-1000)
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  min={0}
                  max={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher values = higher priority
                </p>
              </div>
            )}

            {/* Max Concurrent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Concurrent Executions
              </label>
              <input
                type="number"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of parallel executions allowed
              </p>
            </div>
          </div>
        )}

        {/* Business Hours Tab */}
        {activeTab === 'business-hours' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Business Hours Only</label>
                <p className="text-sm text-gray-600">
                  Only execute during configured business hours
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessHoursOnly}
                  onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {businessHoursOnly && (
              <BusinessHoursEditor
                config={businessHoursConfig}
                onChange={setBusinessHoursConfig}
              />
            )}
          </div>
        )}

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Skip Holidays</label>
                <p className="text-sm text-gray-600">
                  Don't execute on configured holidays
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipHolidays}
                  onChange={(e) => setSkipHolidays(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {skipHolidays && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Holiday Action
                </label>
                <select
                  value={holidayAction}
                  onChange={(e) => setHolidayAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SKIP">Skip execution</option>
                  <option value="DELAY_TO_NEXT">Delay to next business day</option>
                  <option value="EXECUTE">Execute anyway</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  What to do when scheduled time falls on a holiday
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Note:</strong> Holiday calendar management is coming soon. 
                For now, holidays need to be configured via API.
              </p>
            </div>
          </div>
        )}

        {/* Rate Limits Tab */}
        {activeTab === 'limits' && (
          <RateLimitConfig
            maxExecutionsPerHour={maxExecutionsPerHour}
            maxExecutionsPerDay={maxExecutionsPerDay}
            onChangeHourly={setMaxExecutionsPerHour}
            onChangeDaily={setMaxExecutionsPerDay}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <ScheduleHistory workflowId={workflowId} />
        )}
      </div>

      {/* Footer */}
      {activeTab !== 'history' && (
        <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            {configData?.data && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Delete Schedule
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
