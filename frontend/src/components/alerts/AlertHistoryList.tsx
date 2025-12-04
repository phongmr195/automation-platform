/**
 * AlertHistoryList Component
 * Displays alert history with acknowledgment
 */

import React from 'react';
import type { AlertHistory } from '../../services/alertsApi';

interface AlertHistoryListProps {
  history: AlertHistory[];
  loading?: boolean;
  onRefresh: () => void;
}

export const AlertHistoryList: React.FC<AlertHistoryListProps> = ({
  history,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 mb-4">No alerts triggered yet</p>
        <p className="text-sm text-gray-400">
          Alert history will appear here when alerts are triggered
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'CRITICAL':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200">
        {history.map((alert) => (
          <div key={alert.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                    alert.severity
                  )}`}
                >
                  {alert.severity}
                </span>
                {alert.rule && (
                  <span className="text-sm font-medium text-gray-900">
                    {alert.rule.name}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {new Date(alert.triggeredAt).toLocaleString()}
              </span>
            </div>

            <p className="text-gray-900 mb-2">{alert.message}</p>

            {alert.details && (
              <div className="bg-gray-50 rounded p-3 mb-2">
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(alert.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              {alert.acknowledged ? (
                <span className="text-green-600">✓ Acknowledged</span>
              ) : (
                <span>Not acknowledged</span>
              )}
              {alert.workflowId && <span>Workflow: {alert.workflowId}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
