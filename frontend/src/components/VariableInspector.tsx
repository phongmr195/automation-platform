import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface NodeData {
  nodeId: string;
  nodeName: string;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  status: 'pending' | 'running' | 'success' | 'error';
}

interface VariableInspectorProps {
  executionData: NodeData[];
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export default function VariableInspector({ executionData, selectedNodeId, onSelectNode }: VariableInspectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  function toggleNode(nodeId: string) {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  }

  function togglePath(path: string) {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  }

  function copyToClipboard(text: string, path: string) {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  }

  function renderValue(value: any, path: string, depth: number = 0): JSX.Element {
    if (value === null) {
      return <span className="text-purple-600">null</span>;
    }
    
    if (value === undefined) {
      return <span className="text-gray-400">undefined</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-orange-600">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    
    if (typeof value === 'string') {
      return (
        <span className="text-green-600">
          "{value.length > 100 ? value.substring(0, 100) + '...' : value}"
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      const isExpanded = expandedPaths.has(path);
      return (
        <div>
          <button
            onClick={() => togglePath(path)}
            className="inline-flex items-center gap-1 hover:bg-gray-100 rounded px-1"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-gray-600">Array[{value.length}]</span>
          </button>
          
          {isExpanded && (
            <div className="ml-6 mt-1 border-l-2 border-gray-200 pl-4">
              {value.map((item, index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-500">{index}: </span>
                  {renderValue(item, `${path}[${index}]`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      const isExpanded = expandedPaths.has(path);
      
      return (
        <div>
          <button
            onClick={() => togglePath(path)}
            className="inline-flex items-center gap-1 hover:bg-gray-100 rounded px-1"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-gray-600">Object{`{${keys.length}}`}</span>
          </button>
          
          {isExpanded && (
            <div className="ml-6 mt-1 border-l-2 border-gray-200 pl-4">
              {keys.map((key) => (
                <div key={key} className="py-1">
                  <span className="text-purple-700 font-medium">{key}: </span>
                  {renderValue(value[key], `${path}.${key}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="text-gray-600">{String(value)}</span>;
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'running':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Variable Inspector</h3>
      
      {executionData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No execution data available</p>
          <p className="text-sm mt-2">Run the workflow to see variables and outputs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {executionData.map((nodeData) => {
            const isExpanded = expandedNodes.has(nodeData.nodeId);
            const isSelected = selectedNodeId === nodeData.nodeId;
            
            return (
              <div
                key={nodeData.nodeId}
                className={`border-l-4 rounded-lg p-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-500' : getStatusColor(nodeData.status)
                }`}
                onClick={() => {
                  toggleNode(nodeData.nodeId);
                  onSelectNode?.(nodeData.nodeId);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <div>
                      <div className="font-medium text-gray-800">{nodeData.nodeName}</div>
                      <div className="text-xs text-gray-500 font-mono">{nodeData.nodeId}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {nodeData.duration && (
                      <span className="text-xs text-gray-600">{nodeData.duration}ms</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      nodeData.status === 'success' ? 'bg-green-100 text-green-800' :
                      nodeData.status === 'error' ? 'bg-red-100 text-red-800' :
                      nodeData.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {nodeData.status}
                    </span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-3 ml-7 space-y-3">
                    {/* Input Data */}
                    {nodeData.input && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Input:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(JSON.stringify(nodeData.input, null, 2), `${nodeData.nodeId}-input`);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy input"
                          >
                            {copiedPath === `${nodeData.nodeId}-input` ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono overflow-x-auto">
                          {renderValue(nodeData.input, `${nodeData.nodeId}-input`)}
                        </div>
                      </div>
                    )}
                    
                    {/* Output Data */}
                    {nodeData.output && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Output:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(JSON.stringify(nodeData.output, null, 2), `${nodeData.nodeId}-output`);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy output"
                          >
                            {copiedPath === `${nodeData.nodeId}-output` ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono overflow-x-auto">
                          {renderValue(nodeData.output, `${nodeData.nodeId}-output`)}
                        </div>
                      </div>
                    )}
                    
                    {/* Error */}
                    {nodeData.error && (
                      <div>
                        <span className="text-sm font-medium text-red-700">Error:</span>
                        <div className="bg-red-50 p-2 rounded text-sm text-red-800 mt-1">
                          {nodeData.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
