/**
 * WorkflowMetricsTable Component
 * Table showing performance metrics for each workflow
 */

import React from 'react';

interface WorkflowMetric {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutedAt: string | null;
}

interface WorkflowMetricsTableProps {
  metrics: WorkflowMetric[];
  loading?: boolean;
  onWorkflowClick?: (workflowId: string) => void;
}

export const WorkflowMetricsTable: React.FC<WorkflowMetricsTableProps> = ({
  metrics,
  loading = false,
  onWorkflowClick,
}) => {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const calculateSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0;
    return total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Workflow Performance
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Workflow
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Executions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Run
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No workflow metrics available
                </td>
              </tr>
            ) : (
              metrics.map((metric) => {
                const successRate = calculateSuccessRate(
                  metric.successfulExecutions,
                  metric.totalExecutions
                );
                
                return (
                  <tr
                    key={metric.workflowId}
                    className={`hover:bg-gray-50 ${
                      onWorkflowClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onWorkflowClick?.(metric.workflowId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {metric.workflowName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {metric.totalExecutions}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metric.successfulExecutions} success, {metric.failedExecutions} failed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`text-sm font-medium ${
                            Number(successRate) >= 90
                              ? 'text-green-600'
                              : Number(successRate) >= 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {successRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(metric.averageExecutionTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(metric.lastExecutedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
