import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { templateApi } from '../services/templateApi';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TemplateReviews } from './TemplateReviews';
import { TemplateComments } from './TemplateComments';
import type { WorkflowTemplate } from '../types/workflow';

interface TemplatePreviewProps {
  template: WorkflowTemplate;
  onClose: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onClose }) => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [workflowName, setWorkflowName] = useState(template.name);
  const [workflowDescription, setWorkflowDescription] = useState(template.description);
  const [rating, setRating] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'discussion'>('overview');

  // Convert template nodes to ReactFlow format
  const reactFlowNodes = template.nodes.map((node) => ({
    id: node.id,
    type: 'default',
    position: node.position,
    data: {
      label: (
        <div className="text-xs">
          <div className="font-semibold">{node.name}</div>
          <div className="text-gray-500">{node.data.service}</div>
        </div>
      ),
    },
  }));

  const reactFlowEdges = template.connections.map((conn) => ({
    id: conn.id,
    source: conn.source,
    target: conn.target,
    animated: true,
  }));

  // Install mutation
  const installMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) throw new Error('No organization selected');
      if (!user) throw new Error('User not authenticated');

      return templateApi.installTemplate(template.id, {
        name: workflowName,
        description: workflowDescription,
        organizationId: currentOrganization.id,
        userId: user.id,
      });
    },
    onSuccess: (data) => {
      navigate(`/editor/${data.workflowId}`);
    },
  });

  // Rating mutation
  const rateMutation = useMutation({
    mutationFn: (rating: number) => templateApi.rateTemplate(template.id, rating),
  });

  const handleInstall = () => {
    setShowInstallModal(true);
  };

  const handleConfirmInstall = () => {
    installMutation.mutate();
  };

  const handleRate = (newRating: number) => {
    setRating(newRating);
    rateMutation.mutate(newRating);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="text-5xl">{template.icon}</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
                <p className="text-gray-600 mt-1">{template.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {template.category}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {template.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    ⏱️ {template.estimatedTime}
                  </span>
                  {template.featured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                      ⭐ Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Details */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto p-6">
            {/* Stats */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Installs</span>
                  <span className="font-medium">{template.installCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-medium">{template.version}</span>
                </div>
                {template.rating > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating</span>
                    <span className="font-medium">⭐ {(template.rating || 0).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Required Parameters */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Required Setup</h3>
              <div className="space-y-2">
                {Object.entries(template.requiredParams).map(([nodeId, params]) => {
                  const node = template.nodes.find((n) => n.id === nodeId);
                  return (
                    <div key={nodeId} className="text-sm">
                      <div className="font-medium text-gray-700">{node?.name || nodeId}</div>
                      <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                        {params.map((param) => (
                          <li key={param} className="list-disc">
                            {param}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Triggers */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Triggers</h3>
              <div className="space-y-2 text-sm">
                {template.triggers.map((trigger, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    {trigger.type === 'schedule' && <span>⏰</span>}
                    {trigger.type === 'webhook' && <span>🔗</span>}
                    {trigger.type === 'manual' && <span>👆</span>}
                    <span className="text-gray-700">
                      {trigger.type === 'schedule' && `Runs ${trigger.config.cron}`}
                      {trigger.type === 'webhook' && `Webhook: ${trigger.config.path}`}
                      {trigger.type === 'manual' && 'Manual trigger'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rate this template */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Rate this template</h3>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    className={`text-2xl transition-colors ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Tabbed Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reviews'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'discussion'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Discussion
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {activeTab === 'overview' && (
                <div className="h-full">
                  <ReactFlow
                    nodes={reactFlowNodes}
                    edges={reactFlowEdges}
                    fitView
                    attributionPosition="bottom-left"
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>
              )}
              
              {activeTab === 'reviews' && (
                <div className="p-6">
                  <TemplateReviews templateId={template.id} />
                </div>
              )}
              
              {activeTab === 'discussion' && (
                <div className="p-6">
                  <TemplateComments templateId={template.id} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <div className="flex flex-col items-end">
              {!currentOrganization && (
                <p className="text-sm text-red-600 mb-2">
                  ⚠️ Please select an organization first
                </p>
              )}
              <button
                onClick={handleInstall}
                disabled={!currentOrganization || installMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                title={!currentOrganization ? 'Please select an organization first' : ''}
              >
                {installMutation.isPending ? 'Installing...' : '📥 Install Template'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Install Confirmation Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Install Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 After installation, you'll need to configure the required parameters for each node.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInstall}
                disabled={!workflowName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Install & Configure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
