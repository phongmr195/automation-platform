import React, { useState, useEffect } from 'react';
import { GitCompare, ArrowRight } from 'lucide-react';
import { versionControlService } from '../../services/versionControlService';
import { DiffViewer } from './DiffViewer';
import type { WorkflowDiff, WorkflowCommit } from '../../types/versionControl';

interface InlineDiffCompareProps {
  branchId: string;
  onDiffLoaded?: (diff: WorkflowDiff | null) => void;
}

export const InlineDiffCompare: React.FC<InlineDiffCompareProps> = ({
  branchId,
  onDiffLoaded
}) => {
  const [diff, setDiff] = useState<WorkflowDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commits, setCommits] = useState<WorkflowCommit[]>([]);
  const [selectedFrom, setSelectedFrom] = useState('');
  const [selectedTo, setSelectedTo] = useState('');

  useEffect(() => {
    loadCommits();
  }, [branchId]);

  useEffect(() => {
    if (selectedFrom && selectedTo && selectedFrom !== selectedTo) {
      loadDiff();
    } else {
      setDiff(null);
      onDiffLoaded?.(null);
    }
  }, [selectedFrom, selectedTo]);

  const loadCommits = async () => {
    try {
      const { commits } = await versionControlService.getCommitHistory(branchId);
      setCommits(commits);
      
      // Auto-select last 2 commits if available
      if (commits.length >= 2) {
        setSelectedFrom(commits[1].sha);
        setSelectedTo(commits[0].sha);
      }
    } catch (err: any) {
      console.error('Failed to load commits:', err);
    }
  };

  const loadDiff = async () => {
    if (!selectedFrom || !selectedTo) return;

    try {
      setLoading(true);
      setError(null);
      const diffData = await versionControlService.compareDiff(selectedFrom, selectedTo);
      setDiff(diffData);
      onDiffLoaded?.(diffData);
    } catch (err: any) {
      setError(err.message || 'Failed to load diff');
      setDiff(null);
      onDiffLoaded?.(null);
    } finally {
      setLoading(false);
    }
  };

  const getCommitLabel = (commit: WorkflowCommit) => {
    const date = new Date(commit.createdAt).toLocaleDateString();
    return `${commit.sha.substring(0, 7)} - ${commit.message} (${date})`;
  };

  return (
    <div className="space-y-6">
      {/* Commit Selection */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <GitCompare className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Select Commits to Compare</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From (older)
            </label>
            <select
              value={selectedFrom}
              onChange={(e) => setSelectedFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select commit...</option>
              {commits.map((commit) => (
                <option key={commit.id} value={commit.sha}>
                  {getCommitLabel(commit)}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-6 h-6 text-gray-400 mt-6 flex-shrink-0" />

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To (newer)
            </label>
            <select
              value={selectedTo}
              onChange={(e) => setSelectedTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select commit...</option>
              {commits.map((commit) => (
                <option key={commit.id} value={commit.sha}>
                  {getCommitLabel(commit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedFrom && selectedTo && selectedFrom === selectedTo && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Please select different commits to compare
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Diff Results */}
      {loading && (
        <div className="flex items-center justify-center p-12 bg-white border border-gray-200 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading diff...</p>
          </div>
        </div>
      )}

      {!loading && diff && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Changes</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <code className="bg-white px-3 py-1 rounded border border-gray-200">
                  {diff.fromSha.substring(0, 7)}
                </code>
                <ArrowRight className="w-4 h-4" />
                <code className="bg-white px-3 py-1 rounded border border-gray-200">
                  {diff.toSha.substring(0, 7)}
                </code>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DiffViewer diff={diff} showDetails={true} />
          </div>
        </div>
      )}

      {!loading && !diff && selectedFrom && selectedTo && selectedFrom !== selectedTo && !error && (
        <div className="text-center p-12 bg-white border border-gray-200 rounded-lg text-gray-500">
          <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No differences found</p>
          <p className="text-sm mt-2">The selected commits have identical workflow definitions</p>
        </div>
      )}

      {!selectedFrom || !selectedTo ? (
        <div className="text-center p-12 bg-white border border-gray-200 rounded-lg text-gray-500">
          <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select two commits above to compare</p>
          <p className="text-sm mt-2">You'll see the differences in workflow nodes, connections, and settings</p>
        </div>
      ) : null}
    </div>
  );
};
