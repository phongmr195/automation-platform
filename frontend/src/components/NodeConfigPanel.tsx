import { X, Sparkles } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { useState, useEffect, memo } from 'react';
import ExpressionEditor from './ExpressionEditor';
import AutoCompleteInput from './AutoCompleteInput';
import { FieldValidation, FieldValidator } from './FieldValidation';
import TestConfigButton from './TestConfigButton';
import SampleDataPreview from './SampleDataPreview';
import { workflowApi } from '../services/api';

interface NodeParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  default?: any;
  options?: string[];
}

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
  // Communication Nodes
  'email': ['connection', 'to', 'subject', 'body', 'from'],
  'slack': ['connection', 'channel', 'text', 'attachments'],
  'discord': ['connection', 'content', 'embeds'],
  'webhook': ['connection', 'url', 'method', 'headers', 'body'],
  'sms': ['connection', 'to', 'message', 'from'],
  // Cloud Storage Nodes
  'google-drive': ['connection', 'operation', 'fileId', 'fileName', 'folderId'],
  'dropbox': ['connection', 'operation', 'path', 'content'],
  'aws-s3': ['connection', 'operation', 'bucket', 'key', 'body'],
  'azure-blob': ['connection', 'operation', 'containerName', 'blobName', 'content'],
  'onedrive': ['connection', 'operation', 'itemId', 'path', 'content'],
  'box': ['connection', 'operation', 'fileId', 'folderId', 'name'],
  // Database Nodes
  'mysql': ['connection', 'operation', 'table', 'query', 'data'],
  'mongodb': ['connection', 'operation', 'collection', 'filter', 'data'],
  'redis': ['connection', 'operation', 'key', 'value', 'ttl'],
  'airtable': ['connection', 'operation', 'baseId', 'tableId', 'recordId'],
  'firebase': ['connection', 'operation', 'collection', 'documentId', 'data'],
  // Productivity Nodes
  'google-sheets': ['connection', 'spreadsheetId', 'operation', 'range', 'values'],
  'notion': ['connection', 'operation', 'databaseId', 'pageId', 'properties'],
  'trello': ['connection', 'operation', 'boardId', 'listId', 'cardId', 'name'],
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
  // Google Sheets
  'google-sheets': {
    connection: {
      placeholder: '{"clientEmail": "...", "privateKey": "..."}',
      hint: 'Service account credentials (JSON format)'
    },
    spreadsheetId: {
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      hint: 'Google Sheets spreadsheet ID (from URL)'
    },
    operation: {
      placeholder: 'read, append, update, clear, batchUpdate, createSheet',
      hint: 'Operation to perform on the spreadsheet'
    },
    range: {
      placeholder: 'Sheet1!A1:D10',
      hint: 'Range in A1 notation (e.g., Sheet1!A1:D10)'
    },
    values: {
      placeholder: '[["Name", "Email"], ["John", "john@example.com"]]',
      hint: '2D array of values to write'
    },
    sheetName: {
      placeholder: 'NewSheet',
      hint: 'Name for new sheet (createSheet operation)'
    },
  },
  // Notion
  'notion': {
    connection: {
      placeholder: '{"token": "secret_abc123..."}',
      hint: 'Notion integration token'
    },
    operation: {
      placeholder: 'queryDatabase, createPage, updatePage, getPage, appendBlock, search',
      hint: 'Operation to perform'
    },
    databaseId: {
      placeholder: 'abc123-def456-ghi789',
      hint: 'Notion database ID'
    },
    pageId: {
      placeholder: 'abc123-def456-ghi789',
      hint: 'Notion page ID'
    },
    blockId: {
      placeholder: 'abc123-def456-ghi789',
      hint: 'Notion block ID'
    },
    properties: {
      placeholder: '{"Name": {"title": [{"text": {"content": "New Page"}}]}}',
      hint: 'Page properties (JSON format)'
    },
    filter: {
      placeholder: '{"property": "Status", "select": {"equals": "Done"}}',
      hint: 'Query filter (JSON format)'
    },
    query: {
      placeholder: 'search text',
      hint: 'Search query string'
    },
  },
  // Trello
  'trello': {
    connection: {
      placeholder: '{"apiKey": "...", "token": "..."}',
      hint: 'Trello API key and token'
    },
    operation: {
      placeholder: 'getBoard, getLists, createCard, updateCard, addComment',
      hint: 'Operation to perform'
    },
    boardId: {
      placeholder: 'abc123def456',
      hint: 'Trello board ID'
    },
    listId: {
      placeholder: 'abc123def456',
      hint: 'Trello list ID'
    },
    cardId: {
      placeholder: 'abc123def456',
      hint: 'Trello card ID'
    },
    name: {
      placeholder: 'Task name',
      hint: 'Name for list/card'
    },
    desc: {
      placeholder: 'Task description',
      hint: 'Description for card'
    },
    text: {
      placeholder: 'Comment text',
      hint: 'Comment text for card'
    },
  },
};

// Operation options for nodes
const OPERATION_OPTIONS: Record<string, string[]> = {
  'google-sheets': ['read', 'append', 'update', 'clear', 'batchUpdate', 'createSheet'],
  'notion': ['queryDatabase', 'createPage', 'updatePage', 'getPage', 'appendBlock', 'getBlocks', 'search'],
  'trello': ['getBoard', 'getLists', 'createList', 'getCards', 'createCard', 'updateCard', 'getCard', 'deleteCard', 'addComment', 'addChecklist'],
  'mysql': ['query', 'insert', 'update', 'delete', 'select'],
  'mongodb': ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'],
  'redis': ['get', 'set', 'del', 'exists', 'expire', 'hget', 'hset', 'lpush', 'rpush', 'sadd'],
  'firebase': ['get', 'set', 'add', 'update', 'delete', 'query'],
  'airtable': ['list', 'get', 'create', 'update', 'delete'],
  'google-drive': ['list', 'get', 'upload', 'update', 'delete', 'search'],
  'dropbox': ['list', 'get', 'upload', 'delete', 'search'],
  'aws-s3': ['getObject', 'putObject', 'deleteObject', 'listObjects', 'copyObject'],
  'http-request': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

function NodeConfigPanel() {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNode } = useWorkflowStore();
  const { confirm } = useConfirmDialog();
  const [useExpressionEditor, setUseExpressionEditor] = useState<Record<string, boolean>>({});
  const [showValidation] = useState(true);
  const [showSampleData, setShowSampleData] = useState(false);
  const [nodeDefinitions, setNodeDefinitions] = useState<Record<string, NodeParameter[]>>({});
  const [definitionsLoaded, setDefinitionsLoaded] = useState(false);
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Fetch node definitions on mount
  useEffect(() => {
    const fetchNodeDefinitions = async () => {
      try {
        const response = await workflowApi.getNodes();
        const definitions: Record<string, NodeParameter[]> = {};
        
        response.nodes.forEach((node: any) => {
          definitions[node.type] = node.inputs || [];
        });
        
        setNodeDefinitions(definitions);
        setDefinitionsLoaded(true);
        console.log('Node definitions loaded:', definitions);
      } catch (error) {
        console.error('Failed to fetch node definitions:', error);
        setDefinitionsLoaded(true); // Still set to true to prevent infinite loading
      }
    };
    
    fetchNodeDefinitions();
  }, []);

  // Auto-add ALL parameters (required + optional) when node is selected
  useEffect(() => {
    if (!selectedNode) return;
    
    const nodeDef = nodeDefinitions[selectedNode.data.service];
    if (!nodeDef || nodeDef.length === 0) return;
    
    const currentParams = selectedNode.data.parameters || {};
    
    // Check if we need to initialize - only do this once when node is first created
    const shouldInitialize = Object.keys(currentParams || {}).length === 0;
    
    if (shouldInitialize) {
      const newParams = { ...currentParams };
      
      // Add all parameters with their default values
      nodeDef.forEach(param => {
        if (!(param.name in newParams)) {
          newParams[param.name] = param.default !== undefined ? param.default : '';
        }
      });
      
      updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          parameters: newParams,
        },
      });
    }
  }, [selectedNode?.id, selectedNode?.data.service, nodeDefinitions]);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center text-gray-500 text-sm">
        Select a node to configure
      </div>
    );
  }

  const nodeDef = nodeDefinitions[selectedNode.data.service] || [];
  const requiredParams = nodeDef.filter(p => p.required).map(p => p.name);
  const optionalParams = nodeDef.filter(p => !p.required).map(p => p.name);

  // Debug log to check what's happening
  if (selectedNode.data.service === 'slack') {
    console.log('Slack node - nodeDef:', nodeDef);
    console.log('Slack node - requiredParams:', requiredParams);
    console.log('Slack node - optionalParams:', optionalParams);
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
    
    if (Object.keys(envParams || {}).length > 0) {
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

  const toggleExpressionEditor = (key: string) => {
    setUseExpressionEditor((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
                onClick={() => setShowSampleData(!showSampleData)}
                className="px-2 py-1 bg-purple-500 text-white rounded text-xs font-medium hover:bg-purple-600 transition-colors flex items-center gap-1"
                title="Toggle sample data preview"
              >
                <Sparkles className="w-3 h-3" />
                {showSampleData ? 'Hide' : 'Preview'}
              </button>
            </div>
          </div>
          
          {/* Add Optional Parameter Dropdown */}
          {optionalParams.length > 0 && (
            <div className="mb-3">
              <select
                onChange={(e) => {
                  const key = e.target.value;
                  if (key === '__custom__') {
                    // Allow custom parameter input
                    const customKey = prompt('Enter parameter name:');
                    if (customKey && !selectedNode.data.parameters[customKey]) {
                      handleParameterChange(customKey, '');
                    }
                  } else if (key && !selectedNode.data.parameters[key]) {
                    const paramDef = nodeDef.find(p => p.name === key);
                    handleParameterChange(key, paramDef?.default || '');
                  }
                  e.target.value = ''; // Reset select
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer hover:border-blue-400 transition-colors"
              >
                <option value="" className="text-gray-500">➕ Add Optional Parameter...</option>
                {optionalParams.map((param) => {
                  const paramDef = nodeDef.find(p => p.name === param);
                  const isAdded = !!selectedNode.data.parameters[param];
                  return (
                    <option 
                      key={param} 
                      value={param}
                      disabled={isAdded}
                      className={isAdded ? 'text-gray-400' : 'text-gray-900'}
                    >
                      {isAdded ? '✓ ' : ''}{param}{paramDef?.description ? ` - ${paramDef.description.slice(0, 40)}${paramDef.description.length > 40 ? '...' : ''}` : ''}
                    </option>
                  );
                })}
                {SUGGESTED_PARAMS[selectedNode.data.service]?.filter(p => !optionalParams.includes(p) && !requiredParams.includes(p)).map((param) => (
                  <option 
                    key={param} 
                    value={param}
                    disabled={!!selectedNode.data.parameters[param]}
                    className={selectedNode.data.parameters[param] ? 'text-gray-400' : 'text-gray-900'}
                  >
                    {selectedNode.data.parameters[param] ? '✓ ' : ''}{param}
                  </option>
                ))}
                <option value="__custom__" className="text-blue-600 font-medium border-t">➕ Custom Parameter...</option>
              </select>
            </div>
          )}
          
          {/* Info about required params */}
          {requiredParams.length > 0 && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <div className="text-xs text-amber-700">
                <span className="font-medium">Required:</span> {requiredParams.join(', ')}
              </div>
            </div>
          )}
          
          {/* Sample Data Preview */}
          {showSampleData && (
            <div className="mb-3">
              <SampleDataPreview
                nodeType={selectedNode.data.service}
                parameters={selectedNode.data.parameters}
              />
            </div>
          )}
          
          <div className="space-y-3">
            {Object.entries(selectedNode.data.parameters || {}).map(([key, value]) => {
              const hint = PARAM_HINTS[selectedNode.data.service]?.[key];
              const isExpressionField = useExpressionEditor[key];
              const isRequired = requiredParams.includes(key);
              const paramDef = nodeDef.find(p => p.name === key);
              
              // Get validation rules - use backend definition for required check
              const baseValidationRules = FieldValidator.getRulesForField(selectedNode.data.service, key);
              const validationRules = baseValidationRules.filter(r => {
                // Remove hardcoded 'required' rule if backend says it's optional
                if (r.type === 'required') {
                  return false; // Remove all hardcoded required rules
                }
                return true;
              });
              // Add required rule from backend definition only
              if (isRequired && definitionsLoaded) {
                validationRules.unshift({ type: 'required', message: `${key} is required` });
              }
              
              // Debug log for slack channel
              if (selectedNode.data.service === 'slack' && key === 'channel') {
                console.log('Channel validation:', {
                  isRequired,
                  requiredParams,
                  validationRules,
                  definitionsLoaded
                });
              }
              
              return (
                <div key={key} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600">
                      {key}
                      {isRequired && (
                        <span className="text-red-500 ml-1" title="Required parameter">*</span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      {/* Toggle expression editor */}
                      {!['operation', 'method'].includes(key) && (
                        <button
                          onClick={() => toggleExpressionEditor(key)}
                          className={`text-xs px-2 py-0.5 rounded transition-colors ${
                            isExpressionField
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={isExpressionField ? 'Switch to simple input' : 'Use expression editor'}
                        >
                          {isExpressionField ? 'fx' : 'ab'}
                        </button>
                      )}
                      {/* Only allow deletion of optional params */}
                      {!isRequired && (
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
                          title="Remove optional parameter"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {(hint?.hint || paramDef?.description) && (
                    <div className="text-xs text-gray-500 mb-1">
                      {hint?.hint || paramDef?.description}
                    </div>
                  )}
                  
                  {/* Render appropriate input based on field type */}
                  {(key === 'operation' || key === 'method') && (OPERATION_OPTIONS[selectedNode.data.service] || paramDef?.options) ? (
                    <>
                      <select
                        value={String(value)}
                        onChange={(e) => handleParameterChange(key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select {key}...</option>
                        {(paramDef?.options || OPERATION_OPTIONS[selectedNode.data.service])?.map((op: string) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <FieldValidation
                        value={value}
                        rules={validationRules}
                        showValidation={showValidation}
                      />
                    </>
                  ) : isExpressionField ? (
                    /* Expression Editor for complex expressions */
                    <>
                      <ExpressionEditor
                        value={String(value)}
                        onChange={(newValue) => handleParameterChange(key, newValue)}
                        placeholder={hint?.placeholder || `Enter ${key}`}
                        nodeId={selectedNode.id}
                      />
                      <FieldValidation
                        value={value}
                        rules={validationRules}
                        showValidation={showValidation}
                      />
                    </>
                  ) : key === 'connection' || key === 'headers' || key === 'body' || key === 'data' || key === 'filter' || key === 'properties' ? (
                    /* JSON fields - use textarea with validation */
                    <>
                      <div className="relative">
                        <textarea
                          value={String(value)}
                          onChange={(e) => handleParameterChange(key, e.target.value)}
                          placeholder={hint?.placeholder || `Enter ${key} (JSON format)`}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                        />
                        <div className="absolute top-1 right-2 text-xs text-gray-400">JSON</div>
                      </div>
                      <FieldValidation
                        value={value}
                        rules={validationRules}
                        showValidation={showValidation}
                      />
                    </>
                  ) : key === 'url' || key === 'to' || key === 'email' || key === 'from' ? (
                    /* Auto-complete for specific fields */
                    <>
                      <AutoCompleteInput
                        value={String(value)}
                        onChange={(newValue) => handleParameterChange(key, newValue)}
                        placeholder={hint?.placeholder || `Enter ${key}`}
                        nodeId={selectedNode.id}
                        fieldName={key}
                        nodeType={selectedNode.data.service}
                      />
                      <FieldValidation
                        value={value}
                        rules={validationRules}
                        showValidation={showValidation}
                      />
                    </>
                  ) : (
                    /* Regular textarea for other fields */
                    <>
                      <textarea
                        value={String(value)}
                        onChange={(e) => handleParameterChange(key, e.target.value)}
                        placeholder={hint?.placeholder || `Enter ${key}`}
                        rows={key === 'message' || key === 'code' || key === 'text' || key === 'desc' ? 4 : 2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <FieldValidation
                        value={value}
                        rules={validationRules}
                        showValidation={showValidation}
                      />
                    </>
                  )}
                </div>
              );
            })}
            
            {Object.keys(selectedNode.data.parameters || {}).length === 0 && 
             !SUGGESTED_PARAMS[selectedNode.data.service] && (
              <div className="text-xs text-gray-500 text-center py-6 border-2 border-dashed border-gray-200 rounded">
                Click "+ Add" to add parameters
              </div>
            )}
          </div>
        </div>

        {/* Test Configuration */}
        {Object.keys(selectedNode.data.parameters || {}).length > 0 && (
          <div>
            <TestConfigButton
              nodeType={selectedNode.data.service}
              parameters={selectedNode.data.parameters}
              onTestSuccess={(result) => {
                console.log('Test successful:', result);
              }}
              onTestError={(error) => {
                console.error('Test failed:', error);
              }}
            />
          </div>
        )}
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

export default memo(NodeConfigPanel);
