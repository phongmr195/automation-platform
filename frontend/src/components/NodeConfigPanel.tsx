import { X } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useConfirmDialog } from './ui/ConfirmDialog';

// Suggested parameters for each node type
const SUGGESTED_PARAMS: Record<string, string[]> = {
  'lottery-prediction': ['region', 'provider', 'apiKey'],
  'telegram-send': ['botToken', 'chatId', 'message'],
  'http-request': ['url', 'method', 'headers', 'body'],
  'football-results': ['league', 'date'],
  'transform': ['operation', 'code', 'mapping'],
  'condition': ['operator', 'value', 'compareWith'],
  'loop': ['operation', 'items'],
  'database': ['operation', 'table', 'query'],
};

// Parameter hints and placeholders
const PARAM_HINTS: Record<string, Record<string, { placeholder: string; hint: string }>> = {
  'lottery-prediction': {
    region: { 
      placeholder: 'NORTH, CENTRAL, SOUTH', 
      hint: 'Vùng miền xổ số (NORTH=Miền Bắc, CENTRAL=Miền Trung, SOUTH=Miền Nam)' 
    },
    provider: { 
      placeholder: 'groq, claude, openai, gemini', 
      hint: 'AI provider để dự đoán' 
    },
    apiKey: { 
      placeholder: 'gsk_...', 
      hint: 'API key của provider (lấy từ .env hoặc nhập trực tiếp)' 
    },
  },
  'telegram-send': {
    botToken: { 
      placeholder: '1234567890:ABC...', 
      hint: 'Bot token từ @BotFather' 
    },
    chatId: { 
      placeholder: '-100123456789', 
      hint: 'Chat ID hoặc username (@channel)' 
    },
    message: { 
      placeholder: 'Kết quả: {{node-xxx.result}}', 
      hint: 'Nội dung tin nhắn (có thể dùng {{nodeId.field}} để lấy data từ node trước)' 
    },
  },
  'http-request': {
    url: { 
      placeholder: 'https://api.example.com/data', 
      hint: 'URL endpoint' 
    },
    method: { 
      placeholder: 'GET, POST, PUT, DELETE', 
      hint: 'HTTP method' 
    },
    headers: { 
      placeholder: '{"Content-Type": "application/json"}', 
      hint: 'HTTP headers (JSON format)' 
    },
    body: { 
      placeholder: '{"key": "value"}', 
      hint: 'Request body (JSON format)' 
    },
  },
  'football-results': {
    league: { 
      placeholder: '39 (Premier League)', 
      hint: 'League ID (39=Premier, 140=La Liga, 61=Ligue 1)' 
    },
    date: { 
      placeholder: '2024-12-03', 
      hint: 'Ngày (YYYY-MM-DD), để trống = hôm nay' 
    },
  },
};

export default function NodeConfigPanel() {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNode } = useWorkflowStore();
  const { confirm } = useConfirmDialog();
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center text-gray-500 text-sm">
        Select a node to configure
      </div>
    );
  }

  const handleParameterChange = (key: string, value: string) => {
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        parameters: {
          ...selectedNode.data.parameters,
          [key]: value,
        },
      },
    });
  };

  const handleNameChange = (name: string) => {
    updateNode(selectedNode.id, { name });
  };

  const loadFromEnv = () => {
    const service = selectedNode.data.service;
    const envParams: Record<string, string> = {};
    
    // Auto-fill from environment variables
    if (service === 'lottery-prediction') {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      if (groqKey) envParams.apiKey = groqKey;
    } else if (service === 'telegram-send') {
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
      if (botToken) envParams.botToken = botToken;
      if (chatId) envParams.chatId = chatId;
    } else if (service === 'football-results') {
      const footballKey = import.meta.env.VITE_FOOTBALL_API_KEY;
      if (footballKey) envParams.apiKey = footballKey;
    }
    
    if (Object.keys(envParams).length > 0) {
      updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          parameters: {
            ...selectedNode.data.parameters,
            ...envParams,
          },
        },
      });
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold">Node Settings</h2>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Node Name
          </label>
          <input
            type="text"
            value={selectedNode.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
            {selectedNode.data.service}
          </div>
        </div>

        {/* Parameters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Parameters
            </label>
            <div className="flex gap-1">
              {(selectedNode.data.service === 'lottery-prediction' || 
                selectedNode.data.service === 'telegram-send' ||
                selectedNode.data.service === 'football-results') && (
                <button
                  onClick={loadFromEnv}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
                  title="Load credentials from .env"
                >
                  🔑 ENV
                </button>
              )}
              <button
                onClick={() => {
                  const key = prompt('Parameter name:');
                  if (key) {
                    handleParameterChange(key, '');
                  }
                }}
                className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
          
          {/* Suggested Parameters */}
          {Object.keys(selectedNode.data.parameters).length === 0 && 
           SUGGESTED_PARAMS[selectedNode.data.service] && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-xs font-medium text-blue-700 mb-2">
                Suggested parameters:
              </div>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_PARAMS[selectedNode.data.service].map((param) => (
                  <button
                    key={param}
                    onClick={() => handleParameterChange(param, '')}
                    className="px-2 py-1 bg-white border border-blue-300 rounded text-xs text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    + {param}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {Object.entries(selectedNode.data.parameters).map(([key, value]) => {
              const hint = PARAM_HINTS[selectedNode.data.service]?.[key];
              
              return (
                <div key={key} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600">
                      {key}
                    </label>
                    <button
                      onClick={() => {
                        const newParams = { ...selectedNode.data.parameters };
                        delete newParams[key];
                        updateNode(selectedNode.id, {
                          data: {
                            ...selectedNode.data,
                            parameters: newParams,
                          },
                        });
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {hint && (
                    <div className="text-xs text-gray-500 mb-1">
                      {hint.hint}
                    </div>
                  )}
                  <textarea
                    value={String(value)}
                    onChange={(e) => handleParameterChange(key, e.target.value)}
                    placeholder={hint?.placeholder || `Enter ${key}`}
                    rows={key === 'message' || key === 'code' ? 4 : 2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              );
            })}
            
            {Object.keys(selectedNode.data.parameters).length === 0 && 
             !SUGGESTED_PARAMS[selectedNode.data.service] && (
              <div className="text-xs text-gray-500 text-center py-6 border-2 border-dashed border-gray-200 rounded">
                Click "+ Add" to add parameters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={async () => {
            const confirmed = await confirm({
              title: 'Xóa node?',
              description: `Bạn có chắc muốn xóa node "${selectedNode.name}"?`,
              confirmText: 'Xóa',
              cancelText: 'Hủy',
            });
            
            if (confirmed) {
              const { removeNode } = useWorkflowStore.getState();
              removeNode(selectedNode.id);
              setSelectedNodeId(null);
            }
          }}
          className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
