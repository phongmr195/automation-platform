import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, History, Camera, Code, GitCommit, GitCompare } from 'lucide-react';
import { BranchManager } from '../components/version-control/BranchManager';
import { CommitHistory } from '../components/version-control/CommitHistory';
import { CommitCompare } from '../components/version-control/CommitCompare';
import { InlineDiffCompare } from '../components/version-control/InlineDiffCompare';
import { DiffViewer } from '../components/version-control/DiffViewer';
import { SnapshotManager } from '../components/version-control/SnapshotManager';
import { CreateCommitModal } from '../components/version-control/CreateCommitModal';
import { versionControlService } from '../services/versionControlService';
import type { WorkflowBranch, WorkflowCommit, WorkflowDiff } from '../types/versionControl';

type Tab = 'branches' | 'commits' | 'snapshots' | 'diff';

export const VersionControl: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<Tab>('branches');
  const [selectedBranch, setSelectedBranch] = useState<WorkflowBranch | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<WorkflowCommit | null>(null);
  const [compareCommit, setCompareCommit] = useState<WorkflowCommit | null>(null);
  const [diff, setDiff] = useState<WorkflowDiff | null>(null);
  const [showCreateCommit, setShowCreateCommit] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    if (workflowId) {
      loadInitialBranch();
    }
  }, [workflowId]);

  const loadInitialBranch = async () => {
    try {
      const { branches } = await versionControlService.listBranches(workflowId!);
      const defaultBranch = branches.find(b => b.isDefault) || branches[0];
      if (defaultBranch) {
        setSelectedBranch(defaultBranch);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleBranchSelect = (branch: WorkflowBranch) => {
    setSelectedBranch(branch);
    setActiveTab('commits');
  };

  const handleCommitClick = (commit: WorkflowCommit) => {
    setSelectedCommit(commit);
    
    // If we have another commit selected, show diff
    if (compareCommit && commit.sha !== compareCommit.sha) {
      loadDiff(compareCommit.sha, commit.sha);
      setActiveTab('diff');
    }
  };

  const loadDiff = async (fromSha: string, toSha: string) => {
    try {
      setLoadingDiff(true);
      const diffData = await versionControlService.getDiff(fromSha, toSha);
      setDiff(diffData);
    } catch (err) {
      console.error('Failed to load diff:', err);
    } finally {
      setLoadingDiff(false);
    }
  };

  const tabs = [
    { id: 'branches' as Tab, label: 'Branches', icon: GitBranch },
    { id: 'commits' as Tab, label: 'Commit History', icon: History, disabled: !selectedBranch },
    { id: 'snapshots' as Tab, label: 'Snapshots', icon: Camera },
    { id: 'diff' as Tab, label: 'Diff Viewer', icon: Code }
  ];

  if (!workflowId) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">No workflow ID provided</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/editor/${workflowId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Version Control</h1>
              <p className="text-sm text-gray-500 mt-1">
                {selectedBranch ? `Branch: ${selectedBranch.name}` : 'Manage workflow versions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompareModal(true)}
              disabled={!selectedBranch}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <GitCompare className="w-5 h-5" />
              Compare Commits
            </button>
            
            <button
              onClick={() => setShowCreateCommit(true)}
              disabled={!selectedBranch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <GitCommit className="w-5 h-5" />
              Create Commit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {activeTab === 'branches' && (
            <BranchManager
              workflowId={workflowId}
              currentBranchId={selectedBranch?.id}
              onBranchSelect={handleBranchSelect}
            />
          )}

          {activeTab === 'commits' && selectedBranch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Commits on {selectedBranch.name}
                </h2>
                {selectedCommit && (
                  <div className="text-sm text-gray-600">
                    Selected: <code className="bg-gray-100 px-2 py-1 rounded">
                      {selectedCommit.sha.substring(0, 7)}
                    </code>
                  </div>
                )}
              </div>
              <CommitHistory
                branchId={selectedBranch.id}
                onCommitClick={handleCommitClick}
              />
            </div>
          )}

          {activeTab === 'snapshots' && (
            <SnapshotManager
              workflowId={workflowId}
              currentCommitSha={selectedCommit?.sha}
            />
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              {!selectedBranch ? (
                <div className="text-center p-12 bg-white border border-gray-200 rounded-lg text-gray-500">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a branch first to compare commits</p>
                </div>
              ) : (
                <InlineDiffCompare
                  branchId={selectedBranch.id}
                  onDiffLoaded={setDiff}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Commit Modal */}
      {showCreateCommit && selectedBranch && (
        <CreateCommitModal
          workflowId={workflowId}
          versionId={selectedBranch.headCommit?.versionId || ''}
          branchId={selectedBranch.id}
          onClose={() => setShowCreateCommit(false)}
          onSuccess={() => {
            // Reload commits
            if (selectedBranch) {
              setActiveTab('commits');
            }
          }}
        />
      )}

      {/* Compare Commits Modal */}
      {showCompareModal && selectedBranch && (
        <CommitCompare
          branchId={selectedBranch.id}
          fromCommit={compareCommit || undefined}
          toCommit={selectedCommit || undefined}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
};
