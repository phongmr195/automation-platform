import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useReactFlow } from '@xyflow/react';

interface NodeSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NodeSearchPanel({ isOpen, onClose }: NodeSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { nodes, setSelectedNodeId } = useWorkflowStore();
  const { setCenter } = useReactFlow();

  const filteredNodes = nodes.filter((node) =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNodeId(nodeId);
      setCenter(node.position.x + 150, node.position.y + 50, {
        zoom: 1.5,
        duration: 800,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-96">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNodes.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchQuery ? 'No nodes found' : 'Start typing to search nodes'}
            </div>
          ) : (
            <div className="p-2">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      backgroundColor: getNodeColor(node.type),
                    }}
                  >
                    {node.type.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {node.name}
                    </div>
                    <div className="text-xs text-gray-500">{node.type}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 rounded-b-lg">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
            ⌘K
          </kbd>{' '}
          to open · <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">ESC</kbd> to
          close
        </div>
      </div>
    </div>
  );
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    'http-request': '#3b82f6',
    'transform': '#8b5cf6',
    'condition': '#f59e0b',
    'loop': '#10b981',
    'database': '#6366f1',
    'telegram': '#0088cc',
    'email': '#ef4444',
    'slack': '#4a154b',
    'discord': '#5865f2',
    'webhook': '#06b6d4',
  };
  return colors[type] || '#6b7280';
}
