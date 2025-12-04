/**
 * Alerts Page
 * Manage alert rules and channels
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../services/alertsApi';
import { useOrganization } from '../contexts/OrganizationContext';
import { AlertRulesList } from '../components/alerts/AlertRulesList';
import { AlertChannelsList } from '../components/alerts/AlertChannelsList';
import { CreateRuleModal } from '../components/alerts/CreateRuleModal';
import { CreateChannelModal } from '../components/alerts/CreateChannelModal';
import { AlertHistoryList } from '../components/alerts/AlertHistoryList';

type Tab = 'rules' | 'channels' | 'history';

export const Alerts: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('rules');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Fetch alert rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['alerts', 'rules', currentOrganization?.id],
    queryFn: () => alertsApi.getRules({ organizationId: currentOrganization!.id }),
    enabled: !!currentOrganization,
  });

  // Fetch alert channels
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['alerts', 'channels', currentOrganization?.id],
    queryFn: () => alertsApi.getChannels({ organizationId: currentOrganization!.id }),
    enabled: !!currentOrganization,
  });

  // Fetch alert history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['alerts', 'history', currentOrganization?.id],
    queryFn: () => alertsApi.getHistory({ organizationId: currentOrganization!.id }),
    enabled: !!currentOrganization && activeTab === 'history',
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      alertsApi.deleteRule(ruleId, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] });
    },
  });

  // Delete channel mutation
  const deleteChannelMutation = useMutation({
    mutationFn: (channelId: string) =>
      alertsApi.deleteChannel(channelId, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'channels'] });
    },
  });

  // Test channel mutation
  const testChannelMutation = useMutation({
    mutationFn: (channelId: string) =>
      alertsApi.testChannel(channelId, currentOrganization!.id),
  });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'rules', label: 'Alert Rules', count: rules?.length },
    { id: 'channels', label: 'Channels', count: channels?.length },
    { id: 'history', label: 'Alert History' },
  ];

  if (!currentOrganization) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select an organization to manage alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600 mt-1">
            Configure alerts for workflow failures, performance issues, and more
          </p>
        </div>

        <div className="flex gap-3">
          {activeTab === 'rules' && (
            <button
              onClick={() => setShowCreateRule(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Alert Rule
            </button>
          )}
          {activeTab === 'channels' && (
            <button
              onClick={() => setShowCreateChannel(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Channel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'rules' && (
          <AlertRulesList
            rules={rules || []}
            loading={rulesLoading}
            onDelete={(ruleId) => deleteRuleMutation.mutate(ruleId)}
            onRefresh={() =>
              queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] })
            }
          />
        )}

        {activeTab === 'channels' && (
          <AlertChannelsList
            channels={channels || []}
            loading={channelsLoading}
            onDelete={(channelId: string) => deleteChannelMutation.mutate(channelId)}
            onTest={(channelId: string) => testChannelMutation.mutate(channelId)}
            onRefresh={() =>
              queryClient.invalidateQueries({ queryKey: ['alerts', 'channels'] })
            }
          />
        )}

        {activeTab === 'history' && (
          <AlertHistoryList
            history={history || []}
            loading={historyLoading}
            onRefresh={() =>
              queryClient.invalidateQueries({ queryKey: ['alerts', 'history'] })
            }
          />
        )}
      </div>

      {/* Modals */}
      {showCreateRule && (
        <CreateRuleModal
          channels={channels || []}
          organizationId={currentOrganization.id}
          onClose={() => setShowCreateRule(false)}
          onSuccess={() => {
            setShowCreateRule(false);
            queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] });
          }}
        />
      )}

      {showCreateChannel && (
        <CreateChannelModal
          organizationId={currentOrganization.id}
          onClose={() => setShowCreateChannel(false)}
          onSuccess={() => {
            setShowCreateChannel(false);
            queryClient.invalidateQueries({ queryKey: ['alerts', 'channels'] });
          }}
        />
      )}
    </div>
  );
};
