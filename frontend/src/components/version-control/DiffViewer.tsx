import React from 'react';
import { Plus, Minus, AlertCircle, FileCode } from 'lucide-react';
import type { WorkflowDiff } from '../../types/versionControl';

interface DiffViewerProps {
  diff: WorkflowDiff;
  showDetails?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, showDetails = true }) => {
  const getDiffTypeColor = (type: string) => {
    switch (type) {
      case 'COMPLETE_REWRITE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'NODES_CHANGED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CONNECTIONS_CHANGED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'SETTINGS_CHANGED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 border rounded-lg text-sm font-medium ${getDiffTypeColor(diff.diffType)}`}>
            {diff.diffType.replace(/_/g, ' ')}
          </div>

          <div className="flex items-center gap-4 text-sm">
            {diff.nodesAdded > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <Plus className="w-4 h-4" />
                <span>{diff.nodesAdded} nodes added</span>
              </div>
            )}
            {diff.nodesRemoved > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <Minus className="w-4 h-4" />
                <span>{diff.nodesRemoved} nodes removed</span>
              </div>
            )}
            {diff.nodesModified > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <AlertCircle className="w-4 h-4" />
                <span>{diff.nodesModified} nodes modified</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Connections: {diff.connectionsAdded > 0 ? `+${diff.connectionsAdded}` : ''} {diff.connectionsRemoved > 0 ? `-${diff.connectionsRemoved}` : ''}</span>
          {diff.settingsChanged && (
            <div className="flex items-center gap-1 text-yellow-600">
              <FileCode className="w-4 h-4" />
              <span>Settings changed</span>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      {showDetails && diff.diffData && (
        <div className="space-y-4">
          {/* Added Nodes */}
          {diff.diffData.nodes?.added?.length > 0 && (
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-green-50 border-b border-green-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-900">Added Nodes ({diff.diffData.nodes.added.length})</h4>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {diff.diffData.nodes.added.map((node: any, index: number) => (
                  <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-600"></div>
                      <span className="font-medium text-gray-900">{node.name || node.type}</span>
                      <span className="text-sm text-gray-500">({node.type})</span>
                    </div>
                    {node.data && (
                      <pre className="mt-2 text-xs bg-white p-2 rounded border border-green-200 overflow-x-auto">
                        {JSON.stringify(node.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Nodes */}
          {diff.diffData.nodes?.removed?.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <Minus className="w-4 h-4 text-red-600" />
                <h4 className="font-medium text-red-900">Removed Nodes ({diff.diffData.nodes.removed.length})</h4>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {diff.diffData.nodes.removed.map((node: any, index: number) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      <span className="font-medium text-gray-900">{node.name || node.type}</span>
                      <span className="text-sm text-gray-500">({node.type})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified Nodes */}
          {diff.diffData.nodes?.modified?.length > 0 && (
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Modified Nodes ({diff.diffData.nodes.modified.length})</h4>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {diff.diffData.nodes.modified.map((change: any, index: number) => (
                  <div key={index} className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                      <span className="font-medium text-gray-900">{change.after?.name || change.id}</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-blue-200">
                      <div className="p-3 bg-red-50">
                        <div className="text-xs font-medium text-red-900 mb-2">Before</div>
                        <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(change.before, null, 2)}
                        </pre>
                      </div>
                      <div className="p-3 bg-green-50">
                        <div className="text-xs font-medium text-green-900 mb-2">After</div>
                        <pre className="text-xs bg-white p-2 rounded border border-green-200 overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(change.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Changes */}
          {(diff.diffData.connections?.added?.length > 0 || diff.diffData.connections?.removed?.length > 0) && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">Connection Changes</h4>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {diff.diffData.connections.added?.map((conn: any, index: number) => (
                  <div key={`add-${index}`} className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <Plus className="w-4 h-4" />
                    <span>{conn.source} → {conn.target}</span>
                  </div>
                ))}
                {diff.diffData.connections.removed?.map((conn: any, index: number) => (
                  <div key={`rem-${index}`} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    <Minus className="w-4 h-4" />
                    <span>{conn.source} → {conn.target}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Changes */}
          {diff.diffData.settings && (
            <div className="border border-yellow-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-yellow-600" />
                <h4 className="font-medium text-yellow-900">Settings Changes</h4>
              </div>
              <div className="grid grid-cols-2 divide-x divide-yellow-200">
                <div className="p-3 bg-red-50">
                  <div className="text-xs font-medium text-red-900 mb-2">Before</div>
                  <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-x-auto">
                    {JSON.stringify(diff.diffData.settings.before, null, 2)}
                  </pre>
                </div>
                <div className="p-3 bg-green-50">
                  <div className="text-xs font-medium text-green-900 mb-2">After</div>
                  <pre className="text-xs bg-white p-2 rounded border border-green-200 overflow-x-auto">
                    {JSON.stringify(diff.diffData.settings.after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
