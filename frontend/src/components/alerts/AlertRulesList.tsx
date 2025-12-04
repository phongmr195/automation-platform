/**
 * AlertRulesList Component
 * Displays a list of alert rules with actions
 */

import React from 'react';
import type { AlertRule } from '../../services/alertsApi';

interface AlertRulesListProps {
  rules: AlertRule[];
  loading?: boolean;
  onDelete: (ruleId: string) => void;
  onRefresh: () => void;
}

export const AlertRulesList: React.FC<AlertRulesListProps> = ({
  rules,
  loading,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 mb-4">No alert rules configured yet</p>
        <p className="text-sm text-gray-400">
          Create your first alert rule to get notified about workflow events
        </p>
      </div>
    );
  }

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EXECUTION_FAILED: 'Execution Failed',
      EXECUTION_SLOW: 'Slow Execution',
      ERROR_RATE_HIGH: 'High Error Rate',
      SUCCESS_RATE_LOW: 'Low Success Rate',
      SCHEDULE_MISSED: 'Missed Schedule',
      RESOURCE_LIMIT: 'Resource Limit',
      COST_THRESHOLD: 'Cost Threshold',
      CUSTOM: 'Custom',
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Trigger
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Channels
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Triggered
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                {rule.description && (
                  <div className="text-sm text-gray-500">{rule.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {getTriggerTypeLabel(rule.triggerType)}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">
                  {rule.channels?.length || 0} channel(s)
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {rule.enabled ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Enabled
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    Disabled
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {rule.triggerCount} times
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this alert rule?')) {
                      onDelete(rule.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
