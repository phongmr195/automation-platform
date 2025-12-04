/**
 * CreateChannelModal Component
 * Modal for creating a new alert channel
 */

import React, { useState } from 'react';
import { alertsApi, type AlertChannelType } from '../../services/alertsApi';

interface CreateChannelModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  organizationId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AlertChannelType>('EMAIL');
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await alertsApi.createChannel({
        name,
        description,
        organizationId,
        type,
        config,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigFields = () => {
    switch (type) {
      case 'EMAIL':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Addresses * (comma-separated)
              </label>
              <input
                type="text"
                value={config.to?.join(', ') || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value.split(',').map(s => s.trim()) })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="email@example.com, another@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Address (optional)
              </label>
              <input
                type="email"
                value={config.from || ''}
                onChange={(e) => setConfig({ ...config, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="alerts@yourcompany.com"
              />
            </div>
          </div>
        );

      case 'SLACK':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL *
              </label>
              <input
                type="url"
                value={config.webhookUrl || ''}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from Slack's Incoming Webhooks integration
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel (optional)
              </label>
              <input
                type="text"
                value={config.channel || ''}
                onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="#alerts"
              />
            </div>
          </div>
        );

      case 'WEBHOOK':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL *
              </label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HTTP Method
              </label>
              <select
                value={config.method || 'POST'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Alert Channel</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Team Email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Type *
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as AlertChannelType);
                setConfig({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="EMAIL">Email</option>
              <option value="SLACK">Slack</option>
              <option value="WEBHOOK">Webhook</option>
              <option value="DISCORD">Discord</option>
              <option value="TEAMS">Microsoft Teams</option>
            </select>
          </div>

          {renderConfigFields()}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Add Channel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
