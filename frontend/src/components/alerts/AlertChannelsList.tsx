/**
 * AlertChannelsList Component
 * Displays a list of alert channels
 */

import React from 'react';
import type { AlertChannel } from '../../services/alertsApi';

interface AlertChannelsListProps {
  channels: AlertChannel[];
  loading?: boolean;
  onDelete: (channelId: string) => void;
  onTest: (channelId: string) => void;
  onRefresh: () => void;
}

export const AlertChannelsList: React.FC<AlertChannelsListProps> = ({
  channels,
  loading,
  onDelete,
  onTest,
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

  if (channels.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 mb-4">No alert channels configured yet</p>
        <p className="text-sm text-gray-400">
          Add a channel to start receiving alerts via email, Slack, or webhooks
        </p>
      </div>
    );
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return '📧';
      case 'SLACK':
        return '💬';
      case 'WEBHOOK':
        return '🔗';
      default:
        return '📢';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getChannelIcon(channel.type)}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                <p className="text-sm text-gray-500">{channel.type}</p>
              </div>
            </div>
            {channel.enabled ? (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Active
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                Inactive
              </span>
            )}
          </div>

          {channel.description && (
            <p className="text-sm text-gray-600 mb-4">{channel.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Sent:</span>
              <span className="ml-2 font-medium text-gray-900">
                {channel.alertsSent}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Failed:</span>
              <span className="ml-2 font-medium text-gray-900">
                {channel.alertsFailed}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onTest(channel.id)}
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
            >
              Test
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this channel?')) {
                  onDelete(channel.id);
                }
              }}
              className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
