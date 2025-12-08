import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { GitBranch, GitCommit, Tag, Clock, User, ChevronRight } from 'lucide-react';
import { versionControlService } from '../../services/versionControlService';
import type { WorkflowCommit } from '../../types/versionControl';

interface CommitHistoryProps {
  branchId: string;
  onCommitClick?: (commit: WorkflowCommit) => void;
}

export const CommitHistory: React.FC<CommitHistoryProps> = ({ branchId, onCommitClick }) => {
  const [commits, setCommits] = useState<WorkflowCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCommits();
  }, [branchId]);

  const loadCommits = async () => {
    try {
      setLoading(true);
      const { commits } = await versionControlService.getCommitHistory(branchId);
      setCommits(commits);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load commit history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <GitCommit className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No commits yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {commits.map((commit, index) => (
        <div
          key={commit.id}
          className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          onClick={() => onCommitClick?.(commit)}
        >
          {/* Timeline */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 mt-1"></div>
            {index < commits.length - 1 && (
              <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{commit.message}</h4>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{commit.author}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(commit.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <GitCommit className="w-4 h-4" />
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {commit.sha.substring(0, 7)}
                    </code>
                  </div>
                </div>

                {/* Tags */}
                {commit.tags && commit.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {commit.tags.map((tag, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Changes Summary */}
                {commit.changes && (
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    {commit.changes.nodes?.added?.length > 0 && (
                      <span className="text-green-600">
                        +{commit.changes.nodes.added.length} nodes
                      </span>
                    )}
                    {commit.changes.nodes?.removed?.length > 0 && (
                      <span className="text-red-600">
                        -{commit.changes.nodes.removed.length} nodes
                      </span>
                    )}
                    {commit.changes.nodes?.modified?.length > 0 && (
                      <span className="text-blue-600">
                        ~{commit.changes.nodes.modified.length} modified
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
