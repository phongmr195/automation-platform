import React, { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, Download, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { versionControlService } from '../../services/versionControlService';
import type { WorkflowSnapshot } from '../../types/versionControl';

interface SnapshotManagerProps {
  workflowId: string;
  currentCommitSha?: string;
}

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({
  workflowId,
  currentCommitSha
}) => {
  const [snapshots, setSnapshots] = useState<WorkflowSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, [workflowId]);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const { snapshots } = await versionControlService.listSnapshots(workflowId);
      setSnapshots(snapshots);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !currentCommitSha) return;

    try {
      setCreating(true);
      await versionControlService.createSnapshot({
        workflowId,
        name: newName.trim(),
        description: newDesc || undefined,
        commitSha: currentCommitSha
      });
      setNewName('');
      setNewDesc('');
      setShowCreateForm(false);
      await loadSnapshots();
    } catch (err: any) {
      alert(err.message || 'Failed to create snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete snapshot "${name}"?`)) return;

    try {
      await versionControlService.deleteSnapshot(id);
      await loadSnapshots();
    } catch (err: any) {
      alert(err.message || 'Failed to delete snapshot');
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`Restore workflow from snapshot "${name}"? This will create a new commit.`)) return;

    try {
      await versionControlService.restoreSnapshot(id);
      alert('Workflow restored successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to restore snapshot');
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
          <Camera className="w-5 h-5" />
          Snapshots ({snapshots.length})
        </h3>
        {currentCommitSha && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Snapshot
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Snapshot name (e.g., Before major refactor)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewName('');
                setNewDesc('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No commit warning */}
      {!currentCommitSha && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">No commit selected</h4>
            <p className="text-sm text-yellow-800 mt-1">
              Please select a commit or create one before creating snapshots
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Snapshot List */}
      <div className="space-y-2">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="p-4 border border-gray-200 bg-white rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <h4 className="font-medium text-gray-900 truncate">{snapshot.name}</h4>
                </div>

                {snapshot.description && (
                  <p className="text-sm text-gray-600 mb-2">{snapshot.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(snapshot.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded">
                    {snapshot.commitSha.substring(0, 7)}
                  </code>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestore(snapshot.id, snapshot.name)}
                  className="p-2 hover:bg-green-100 rounded-lg transition-colors group"
                  title="Restore snapshot"
                >
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                </button>
                <button
                  onClick={() => handleDelete(snapshot.id, snapshot.name)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                  title="Delete snapshot"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {snapshots.length === 0 && !loading && (
        <div className="text-center p-8 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No snapshots yet</p>
          <p className="text-sm mt-1">Create named snapshots to save important workflow states</p>
        </div>
      )}
    </div>
  );
};
