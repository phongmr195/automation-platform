import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Shield, Star, Trash2, Edit2, Check, X } from 'lucide-react';
import { versionControlService } from '../../services/versionControlService';
import type { WorkflowBranch } from '../../types/versionControl';

interface BranchManagerProps {
  workflowId: string;
  currentBranchId?: string;
  onBranchSelect?: (branch: WorkflowBranch) => void;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  workflowId,
  currentBranchId,
  onBranchSelect
}) => {
  const [branches, setBranches] = useState<WorkflowBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBranches();
  }, [workflowId]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const { branches } = await versionControlService.listBranches(workflowId);
      setBranches(branches);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      setCreating(true);
      await versionControlService.createBranch({
        workflowId,
        name: newBranchName,
        description: newBranchDesc || undefined
      });
      setNewBranchName('');
      setNewBranchDesc('');
      setShowCreateForm(false);
      await loadBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Delete branch "${branchName}"?`)) return;

    try {
      await versionControlService.deleteBranch(branchId);
      await loadBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to delete branch');
    }
  };

  const handleSetDefault = async (branchId: string) => {
    try {
      await versionControlService.updateBranch(branchId, { isDefault: true });
      await loadBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to set default branch');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Branches ({branches.length})
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Branch
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Branch name (e.g., feature/new-nodes)"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={newBranchDesc}
            onChange={(e) => setNewBranchDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateBranch}
              disabled={creating || !newBranchName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewBranchName('');
                setNewBranchDesc('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Branch List */}
      <div className="space-y-2">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`p-4 border rounded-lg transition-all cursor-pointer ${
              branch.id === currentBranchId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
            onClick={() => onBranchSelect?.(branch)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <h4 className="font-medium text-gray-900 truncate">{branch.name}</h4>
                  
                  {branch.isDefault && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      <Star className="w-3 h-3" />
                      <span>Default</span>
                    </div>
                  )}
                  
                  {branch.isProtected && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      <Shield className="w-3 h-3" />
                      <span>Protected</span>
                    </div>
                  )}
                </div>

                {branch.description && (
                  <p className="text-sm text-gray-600 mt-1">{branch.description}</p>
                )}

                {branch.headCommit && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>Latest:</span>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">
                      {branch.headSha?.substring(0, 7)}
                    </code>
                    <span>{branch.headCommit.message}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!branch.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(branch.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Set as default"
                  >
                    <Star className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                
                {!branch.isDefault && !branch.isProtected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBranch(branch.id, branch.name);
                    }}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete branch"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && !loading && (
        <div className="text-center p-8 text-gray-500">
          <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No branches yet. Create your first branch to get started.</p>
        </div>
      )}
    </div>
  );
};
