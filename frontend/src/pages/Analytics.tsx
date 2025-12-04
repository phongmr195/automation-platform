/**
 * Analytics Dashboard Page
 * Main page for viewing workflow execution analytics and metrics
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/analyticsApi';
import { StatCard } from '../components/analytics/StatCard';
import { ExecutionChart } from '../components/analytics/ExecutionChart';
import { WorkflowMetricsTable } from '../components/analytics/WorkflowMetricsTable';
import { ResourceUsageChart } from '../components/analytics/ResourceUsageChart';
import { useNavigate } from 'react-router-dom';

type TimeRange = '24h' | '7d' | '30d' | '90d';

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['analytics', 'dashboard', timeRange],
    queryFn: () => analyticsApi.getDashboard({ timeRange }),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30s if enabled
  });

  // Fetch workflow metrics
  const { data: workflowMetrics, isLoading: isWorkflowLoading } = useQuery({
    queryKey: ['analytics', 'workflow-metrics', timeRange],
    queryFn: () => analyticsApi.getWorkflowMetrics({ timeRange }),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch resource metrics
  const { data: resourceMetrics, isLoading: isResourceLoading } = useQuery({
    queryKey: ['analytics', 'resource-metrics', timeRange],
    queryFn: () => analyticsApi.getResourceMetrics({ timeRange }),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const handleWorkflowClick = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  const handleExport = async (type: 'executions' | 'workflows' | 'resources') => {
    try {
      const blob = await analyticsApi.exportData({
        format: 'csv',
        type,
        timeRange,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${timeRange}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const successRate = dashboardData
    ? ((dashboardData.successfulExecutions / dashboardData.totalExecutions) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Monitor workflow performance and resource usage
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>

          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Export menu */}
          <div className="relative group">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('executions')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                Export Executions
              </button>
              <button
                onClick={() => handleExport('workflows')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export Workflows
              </button>
              <button
                onClick={() => handleExport('resources')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                Export Resources
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Executions"
          value={dashboardData?.totalExecutions.toLocaleString() || '0'}
          loading={isDashboardLoading}
          subtitle={`${timeRange} period`}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          loading={isDashboardLoading}
          trend={{
            value: 5.2,
            isPositive: true,
          }}
        />
        <StatCard
          title="Avg Execution Time"
          value={
            dashboardData?.averageExecutionTime
              ? `${(dashboardData.averageExecutionTime / 1000).toFixed(1)}s`
              : '0s'
          }
          loading={isDashboardLoading}
        />
        <StatCard
          title="Active Workflows"
          value={dashboardData?.activeWorkflows || 0}
          loading={isDashboardLoading}
          subtitle={`of ${dashboardData?.totalWorkflows || 0} total`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutionChart
          data={dashboardData?.executionTrend || []}
          loading={isDashboardLoading}
        />
        <ResourceUsageChart
          data={resourceMetrics?.usageByDay || []}
          loading={isResourceLoading}
        />
      </div>

      {/* Resource Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="CPU Usage"
          value={`${resourceMetrics?.averageCpu.toFixed(1) || 0}%`}
          loading={isResourceLoading}
          subtitle={`Peak: ${resourceMetrics?.maxCpu.toFixed(1) || 0}%`}
        />
        <StatCard
          title="Memory Usage"
          value={`${resourceMetrics?.averageMemory.toFixed(1) || 0}%`}
          loading={isResourceLoading}
          subtitle={`Peak: ${resourceMetrics?.maxMemory.toFixed(1) || 0}%`}
        />
        <StatCard
          title="Storage"
          value={
            resourceMetrics?.totalStorage
              ? `${(resourceMetrics.totalStorage / 1024 / 1024 / 1024).toFixed(2)} GB`
              : '0 GB'
          }
          loading={isResourceLoading}
        />
      </div>

      {/* Workflow Metrics Table */}
      <WorkflowMetricsTable
        metrics={workflowMetrics || []}
        loading={isWorkflowLoading}
        onWorkflowClick={handleWorkflowClick}
      />

      {/* Recent Executions */}
      {dashboardData?.recentExecutions && dashboardData.recentExecutions.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Executions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Started At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentExecutions.map((execution) => (
                  <tr
                    key={execution.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/executions/${execution.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {execution.workflowName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          execution.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {execution.duration
                        ? `${(execution.duration / 1000).toFixed(2)}s`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(execution.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
