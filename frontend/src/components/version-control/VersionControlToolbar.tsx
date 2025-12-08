import React, { useState } from 'react';
import { GitBranch, History, RotateCcw, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { versionControlService } from '../../services/versionControlService';
import { useAutoVersioning } from '../../hooks/useAutoVersioning';

interface VersionControlToolbarProps {
  workflowId: string;
  currentNodes: any[];
  currentConnections: any[];
  currentSettings?: any;
  currentTriggers?: any[];
  onRollback?: (version: any) => void;
}

export const VersionControlToolbar: React.FC<VersionControlToolbarProps> = ({
  workflowId,
  currentNodes,
  currentConnections,
  currentSettings,
  currentTriggers = [],
  onRollback
}) => {
  const navigate = useNavigate();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  const { isVersioning, lastCommitSha, triggerVersion } = useAutoVersioning({
    workflowId,
    enabled: true,
    autoCommitMessage: 'Auto-save checkpoint',
    onVersionCreated: (sha) => {
      console.log('Version created:', sha);
      setLastSaveTime(new Date());
    },
    onError: (error) => {
      console.error('Versioning error:', error);
    }
  });

  const handleSaveVersion = async () => {
    const message = prompt('Commit message:', 'Manual save');
    if (!message) return;

    await triggerVersion(
      { 
        nodes: currentNodes, 
        connections: currentConnections,
        settings: currentSettings,
        triggers: currentTriggers
      },
      message
    );
  };

  const handleViewHistory = () => {
    navigate(`/workflows/${workflowId}/version-control`);
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={() => setShowQuickActions(!showQuickActions)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        title="Version Control"
      >
        <GitBranch className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700">Version Control</span>
        {isVersioning && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Quick Actions Dropdown */}
      {showQuickActions && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 space-y-1">
            <button
              onClick={handleSaveVersion}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <Save className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Save Version</div>
                <div className="text-xs text-gray-500">Create commit</div>
              </div>
            </button>

            <button
              onClick={handleViewHistory}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <History className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">View History</div>
                <div className="text-xs text-gray-500">Browse commits & branches</div>
              </div>
            </button>

            {lastCommitSha && (
              <div className="px-3 py-2 border-t border-gray-200 mt-2 pt-2">
                <div className="text-xs text-gray-500">Last commit</div>
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {lastCommitSha.substring(0, 7)}
                </code>
                {lastSaveTime && (
                  <div className="text-xs text-gray-400 mt-1">
                    {lastSaveTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showQuickActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowQuickActions(false)}
        />
      )}
    </div>
  );
};
