/**
 * CreateRuleModal Component
 * Modal for creating a new alert rule
 */

import React, { useState } from 'react';
import { alertsApi, type AlertChannel, type AlertTriggerType } from '../../services/alertsApi';

interface CreateRuleModalProps {
  channels: AlertChannel[];
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRuleModal: React.FC<CreateRuleModalProps> = ({
  channels,
  organizationId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<AlertTriggerType>('EXECUTION_FAILED');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [durationThreshold, setDurationThreshold] = useState('30000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const conditions: any = {};
      
      if (triggerType === 'EXECUTION_SLOW') {
        conditions.durationThreshold = parseInt(durationThreshold);
      }

      await alertsApi.createRule({
        name,
        description,
        organizationId,
        triggerType,
        conditions,
        channelIds: selectedChannels,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert rule');
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Alert Rule</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Critical Workflow Failures"
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
              Trigger Type *
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AlertTriggerType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="EXECUTION_FAILED">Execution Failed</option>
              <option value="EXECUTION_SLOW">Execution Slow</option>
              <option value="ERROR_RATE_HIGH">Error Rate High</option>
              <option value="SUCCESS_RATE_LOW">Success Rate Low</option>
              <option value="SCHEDULE_MISSED">Schedule Missed</option>
              <option value="RESOURCE_LIMIT">Resource Limit</option>
              <option value="COST_THRESHOLD">Cost Threshold</option>
            </select>
          </div>

          {triggerType === 'EXECUTION_SLOW' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration Threshold (ms)
              </label>
              <input
                type="number"
                value={durationThreshold}
                onChange={(e) => setDurationThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Channels * (select at least one)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {channels.length === 0 ? (
                <p className="text-sm text-gray-500">No channels available. Create a channel first.</p>
              ) : (
                channels.map(channel => (
                  <label key={channel.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(channel.id)}
                      onChange={() => toggleChannel(channel.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{channel.name} ({channel.type})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || selectedChannels.length === 0}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Rule'}
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
