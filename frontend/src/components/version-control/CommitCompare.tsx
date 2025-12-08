import React, { useState, useEffect } from 'react';
import { GitCompare, X, ArrowRight } from 'lucide-react';
import { versionControlService } from '../../services/versionControlService';
import { DiffViewer } from './DiffViewer';
import type { WorkflowDiff, WorkflowCommit } from '../../types/versionControl';

interface CommitCompareProps {
  branchId: string;
  fromCommit?: WorkflowCommit;
  toCommit?: WorkflowCommit;
  onClose: () => void;
}

export const CommitCompare: React.FC<CommitCompareProps> = ({
  branchId,
  fromCommit,
  toCommit,
  onClose
}) => {
  const [diff, setDiff] = useState<WorkflowDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commits, setCommits] = useState<WorkflowCommit[]>([]);
  const [selectedFrom, setSelectedFrom] = useState(fromCommit?.sha || '');
  const [selectedTo, setSelectedTo] = useState(toCommit?.sha || '');

  useEffect(() => {
    loadCommits();
  }, [branchId]);

  useEffect(() => {
    if (selectedFrom && selectedTo && selectedFrom !== selectedTo) {
      loadDiff();
    }
  }, [selectedFrom, selectedTo]);

  const loadCommits = async () => {
    try {
      const { commits } = await versionControlService.getCommitHistory(branchId);
      setCommits(commits);
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
    } catch (err: any) {
      setError(err.message || 'Failed to load diff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Compare Commits</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Commit Selection */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Commit
              </label>
              <select
                value={selectedFrom}
                onChange={(e) => setSelectedFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select commit...</option>
                {commits.map((commit) => (
                  <option key={commit.id} value={commit.sha}>
                    {commit.sha.substring(0, 7)} - {commit.message}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 mt-6" />

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Commit
              </label>
              <select
                value={selectedTo}
                onChange={(e) => setSelectedTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select commit...</option>
                {commits.map((commit) => (
                  <option key={commit.id} value={commit.sha}>
                    {commit.sha.substring(0, 7)} - {commit.message}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedFrom && selectedTo && selectedFrom === selectedTo && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Please select different commits to compare
            </div>
          )}
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && diff && (
            <DiffViewer diff={diff} showDetails={true} />
          )}

          {!loading && !error && !diff && selectedFrom && selectedTo && selectedFrom !== selectedTo && (
            <div className="text-center text-gray-500 p-12">
              <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No differences found between these commits</p>
            </div>
          )}

          {!selectedFrom || !selectedTo ? (
            <div className="text-center text-gray-500 p-12">
              <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select two commits to compare</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
