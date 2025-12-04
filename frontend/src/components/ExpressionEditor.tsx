import { useState, useRef, useEffect } from 'react';
import { Code2, Variable, Calendar, Hash, Type } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nodeId?: string;
}

// Expression functions available
const EXPRESSION_FUNCTIONS = [
  { category: 'String', items: [
    { name: '$uppercase', desc: 'Convert to uppercase', example: '$uppercase("hello")' },
    { name: '$lowercase', desc: 'Convert to lowercase', example: '$lowercase("HELLO")' },
    { name: '$trim', desc: 'Remove whitespace', example: '$trim("  text  ")' },
    { name: '$substring', desc: 'Extract substring', example: '$substring("hello", 0, 3)' },
    { name: '$replace', desc: 'Replace text', example: '$replace("hello", "h", "H")' },
    { name: '$split', desc: 'Split string', example: '$split("a,b,c", ",")' },
  ]},
  { category: 'Date', items: [
    { name: '$now', desc: 'Current timestamp', example: '$now()' },
    { name: '$today', desc: 'Today\'s date', example: '$today()' },
    { name: '$formatDate', desc: 'Format date', example: '$formatDate($now(), "YYYY-MM-DD")' },
    { name: '$addDays', desc: 'Add days to date', example: '$addDays($now(), 7)' },
  ]},
  { category: 'Number', items: [
    { name: '$round', desc: 'Round number', example: '$round(3.14159, 2)' },
    { name: '$floor', desc: 'Round down', example: '$floor(3.7)' },
    { name: '$ceil', desc: 'Round up', example: '$ceil(3.2)' },
    { name: '$abs', desc: 'Absolute value', example: '$abs(-5)' },
    { name: '$sum', desc: 'Sum of array', example: '$sum([1, 2, 3])' },
    { name: '$avg', desc: 'Average of array', example: '$avg([1, 2, 3])' },
  ]},
  { category: 'Array', items: [
    { name: '$length', desc: 'Array length', example: '$length([1, 2, 3])' },
    { name: '$first', desc: 'First element', example: '$first([1, 2, 3])' },
    { name: '$last', desc: 'Last element', example: '$last([1, 2, 3])' },
    { name: '$filter', desc: 'Filter array', example: '$filter(items, item => item.active)' },
    { name: '$map', desc: 'Transform array', example: '$map(items, item => item.name)' },
  ]},
  { category: 'Logic', items: [
    { name: '$if', desc: 'Conditional', example: '$if(condition, trueValue, falseValue)' },
    { name: '$isEmpty', desc: 'Check if empty', example: '$isEmpty(value)' },
    { name: '$isNull', desc: 'Check if null', example: '$isNull(value)' },
  ]},
];

export default function ExpressionEditor({ value, onChange, placeholder, nodeId }: ExpressionEditorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeTab, setActiveTab] = useState<'variables' | 'functions'>('variables');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { nodes } = useWorkflowStore();

  // Get available nodes (exclude current node)
  const availableNodes = nodes.filter(n => n.id !== nodeId);

  // Detect {{ for auto-complete
  useEffect(() => {
    const text = value.substring(0, cursorPosition);
    const lastOpenBrace = text.lastIndexOf('{{');
    const lastCloseBrace = text.lastIndexOf('}}');
    
    // Show suggestions if {{ is more recent than }}
    if (lastOpenBrace > lastCloseBrace && lastOpenBrace >= text.length - 20) {
      setShowSuggestions(true);
    }
  }, [value, cursorPosition]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const insertExpression = (expr: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + expr + value.substring(end);
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + expr.length, start + expr.length);
    }, 0);
  };

  const insertVariable = (nodeId: string, field: string) => {
    insertExpression(`{{nodes.${nodeId}.${field}}}`);
  };

  const insertFunction = (_funcName: string, example: string) => {
    // Extract just the function call from example
    const match = example.match(/(\$\w+\([^)]*\))/);
    if (match) {
      insertExpression(match[1]);
    }
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1 pb-2 border-b border-gray-200">
        <button
          onClick={() => {
            setShowSuggestions(true);
            setActiveTab('variables');
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          title="Insert variable"
        >
          <Variable className="w-3 h-3" />
          Variables
        </button>
        <button
          onClick={() => {
            setShowSuggestions(true);
            setActiveTab('functions');
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
          title="Insert function"
        >
          <Code2 className="w-3 h-3" />
          Functions
        </button>
        <div className="ml-auto text-xs text-gray-400">
          Use {'{{'} {'}'} for expressions
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onFocus={() => setCursorPosition(textareaRef.current?.selectionStart || 0)}
          onClick={() => setCursorPosition(textareaRef.current?.selectionStart || 0)}
          onKeyUp={() => setCursorPosition(textareaRef.current?.selectionStart || 0)}
          placeholder={placeholder || 'Enter expression or text...'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('variables')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'variables'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Variable className="w-4 h-4 inline mr-1" />
              Variables
            </button>
            <button
              onClick={() => setActiveTab('functions')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'functions'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Code2 className="w-4 h-4 inline mr-1" />
              Functions
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-80">
            {activeTab === 'variables' ? (
              <div className="p-2">
                {availableNodes.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">
                    No previous nodes available
                  </div>
                ) : (
                  availableNodes.map((node) => (
                    <div key={node.id} className="mb-2">
                      <div className="text-xs font-semibold text-gray-700 px-2 py-1">
                        {node.name} ({node.id})
                      </div>
                      <div className="space-y-1">
                        {['output', 'result', 'data', 'value', 'response'].map((field) => (
                          <button
                            key={field}
                            onClick={() => insertVariable(node.id, field)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 rounded flex items-center gap-2 group"
                          >
                            <Type className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                            <span className="text-gray-700 group-hover:text-blue-600">
                              {field}
                            </span>
                            <span className="ml-auto text-gray-400 text-xs font-mono">
                              {`{{nodes.${node.id}.${field}}}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-2">
                {EXPRESSION_FUNCTIONS.map((category) => (
                  <div key={category.category} className="mb-3">
                    <div className="text-xs font-semibold text-gray-700 px-2 py-1 flex items-center gap-1">
                      {category.category === 'Date' && <Calendar className="w-3 h-3" />}
                      {category.category === 'Number' && <Hash className="w-3 h-3" />}
                      {category.category}
                    </div>
                    <div className="space-y-1">
                      {category.items.map((func) => (
                        <button
                          key={func.name}
                          onClick={() => insertFunction(func.name, func.example)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 rounded group"
                        >
                          <div className="flex items-center gap-2">
                            <Code2 className="w-3 h-3 text-gray-400 group-hover:text-purple-600" />
                            <span className="font-mono text-purple-600 group-hover:text-purple-700">
                              {func.name}
                            </span>
                            <span className="text-gray-500">- {func.desc}</span>
                          </div>
                          <div className="mt-1 ml-5 text-gray-400 font-mono">
                            {func.example}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="border-t border-gray-200 p-2 flex justify-end">
            <button
              onClick={() => setShowSuggestions(false)}
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Expression syntax help */}
      <div className="mt-1 text-xs text-gray-500">
        <div className="flex gap-3">
          <span>• Use <code className="bg-gray-100 px-1 rounded">{'{{'} nodes.nodeId.field {'}}'}</code> for node data</span>
          <span>• Use <code className="bg-gray-100 px-1 rounded">$function()</code> for operations</span>
        </div>
      </div>
    </div>
  );
}
