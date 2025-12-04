import { useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { workflowApi } from '../services/api';
import { useWorkflowStore } from '../stores/workflowStore';
import type { NodeDefinition } from '../types/workflow';

// Default parameters for each node type
const DEFAULT_PARAMS: Record<string, Record<string, string>> = {
  'lottery-prediction': {
    region: 'NORTH',
    provider: 'groq',
    apiKey: '',
  },
  'telegram-send': {
    botToken: '',
    chatId: '',
    message: '',
  },
  'http-request': {
    url: '',
    method: 'GET',
    headers: '{}',
    body: '',
  },
  'football-results': {
    league: '39',
    date: '',
  },
  'transform': {
    operation: 'code',
    code: 'return data;',
  },
  'condition': {
    operator: '==',
    value: '',
    compareWith: '',
  },
  'loop': {
    operation: 'forEach',
    items: '',
  },
  'database': {
    operation: 'findMany',
    table: '',
    query: '{}',
  },
};

export default function NodePalette() {
  const [search, setSearch] = useState('');
  const { addNode } = useWorkflowStore();
  
  const { data, isLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: workflowApi.getNodes,
  });

  const nodes = data?.nodes || [];
  
  // Group nodes by category
  const groupedNodes = nodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeDefinition[]>);

  // Filter nodes by search
  const filteredGroups = Object.entries(groupedNodes).reduce((acc, [category, nodeList]) => {
    const filtered = nodeList.filter((node) =>
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.type.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, NodeDefinition[]>);

  const handleAddNode = (nodeType: string) => {
    const newNode = {
      id: `node-${Date.now()}`,
      name: nodeType,
      type: 'action' as const,
      position: { x: 250, y: 100 },
      data: {
        service: nodeType,
        operation: 'execute',
        parameters: DEFAULT_PARAMS[nodeType] || {},
      },
    };
    addNode(newNode);
  };

  if (isLoading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-3">Nodes</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(filteredGroups).map(([category, nodeList]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {category}
            </h3>
            <div className="space-y-1">
              {nodeList.map((node) => (
                <button
                  key={node.type}
                  onClick={() => handleAddNode(node.type)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-left group transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {node.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {node.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        
        {Object.keys(filteredGroups).length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            No nodes found
          </div>
        )}
      </div>
    </div>
  );
}
