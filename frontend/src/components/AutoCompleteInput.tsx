import { useState, useRef, useEffect } from 'react';
import { Lightbulb, Variable, Clock, FileText } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';

interface AutoCompleteSuggestion {
  value: string;
  label: string;
  description?: string;
  type: 'variable' | 'value' | 'template' | 'history';
}

interface AutoCompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nodeId?: string;
  fieldName?: string;
  nodeType?: string;
  suggestions?: AutoCompleteSuggestion[];
}

// Common value suggestions for different fields
const COMMON_VALUES: Record<string, AutoCompleteSuggestion[]> = {
  method: [
    { value: 'GET', label: 'GET', description: 'Retrieve data', type: 'value' },
    { value: 'POST', label: 'POST', description: 'Create data', type: 'value' },
    { value: 'PUT', label: 'PUT', description: 'Update data', type: 'value' },
    { value: 'DELETE', label: 'DELETE', description: 'Delete data', type: 'value' },
    { value: 'PATCH', label: 'PATCH', description: 'Partial update', type: 'value' },
  ],
  contentType: [
    { value: 'application/json', label: 'JSON', type: 'value' },
    { value: 'application/x-www-form-urlencoded', label: 'Form Data', type: 'value' },
    { value: 'multipart/form-data', label: 'Multipart', type: 'value' },
    { value: 'text/plain', label: 'Plain Text', type: 'value' },
  ],
  region: [
    { value: 'NORTH', label: 'Miền Bắc', type: 'value' },
    { value: 'CENTRAL', label: 'Miền Trung', type: 'value' },
    { value: 'SOUTH', label: 'Miền Nam', type: 'value' },
  ],
  provider: [
    { value: 'groq', label: 'Groq', description: 'Fast inference', type: 'value' },
    { value: 'openai', label: 'OpenAI', description: 'GPT models', type: 'value' },
    { value: 'claude', label: 'Claude', description: 'Anthropic', type: 'value' },
    { value: 'gemini', label: 'Gemini', description: 'Google', type: 'value' },
  ],
};

// Template suggestions for common fields
const TEMPLATE_SUGGESTIONS: Record<string, AutoCompleteSuggestion[]> = {
  headers: [
    { 
      value: '{"Content-Type": "application/json", "Authorization": "Bearer {{token}}"}', 
      label: 'JSON with Auth', 
      type: 'template' 
    },
    { 
      value: '{"Content-Type": "application/json"}', 
      label: 'JSON Only', 
      type: 'template' 
    },
  ],
  body: [
    { 
      value: '{"key": "value"}', 
      label: 'Simple Object', 
      type: 'template' 
    },
    { 
      value: '{"data": {{nodes.previousNode.output}}}', 
      label: 'Pass Previous Output', 
      type: 'template' 
    },
  ],
  message: [
    { 
      value: 'Success: {{nodes.previousNode.result}}', 
      label: 'Success Message', 
      type: 'template' 
    },
    { 
      value: 'Error: {{error}}', 
      label: 'Error Message', 
      type: 'template' 
    },
  ],
};

export default function AutoCompleteInput({
  value,
  onChange,
  placeholder,
  nodeId,
  fieldName,
  suggestions: customSuggestions,
}: AutoCompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { nodes } = useWorkflowStore();

  // Build suggestions list
  const buildSuggestions = (inputValue: string): AutoCompleteSuggestion[] => {
    const allSuggestions: AutoCompleteSuggestion[] = [];

    // Add custom suggestions
    if (customSuggestions) {
      allSuggestions.push(...customSuggestions);
    }

    // Add common values for specific fields
    if (fieldName && COMMON_VALUES[fieldName]) {
      allSuggestions.push(...COMMON_VALUES[fieldName]);
    }

    // Add template suggestions
    if (fieldName && TEMPLATE_SUGGESTIONS[fieldName]) {
      allSuggestions.push(...TEMPLATE_SUGGESTIONS[fieldName]);
    }

    // Add variable suggestions from previous nodes
    const previousNodes = nodes.filter(n => n.id !== nodeId);
    previousNodes.forEach((node) => {
      ['output', 'result', 'data', 'value', 'response'].forEach((field) => {
        allSuggestions.push({
          value: `{{nodes.${node.id}.${field}}}`,
          label: `${node.name}.${field}`,
          description: `From ${node.name}`,
          type: 'variable',
        });
      });
    });

    // Filter based on input
    if (!inputValue) {
      return allSuggestions;
    }

    return allSuggestions.filter((s) =>
      s.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      s.value.toLowerCase().includes(inputValue.toLowerCase())
    );
  };

  // Update suggestions when value changes
  useEffect(() => {
    const suggestions = buildSuggestions(value);
    setFilteredSuggestions(suggestions);
    setSelectedIndex(0);
  }, [value, nodes, nodeId]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === ' ')) {
        setShowSuggestions(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          selectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const selectSuggestion = (suggestion: AutoCompleteSuggestion) => {
    onChange(suggestion.value);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'variable':
        return <Variable className="w-3 h-3 text-blue-500" />;
      case 'template':
        return <FileText className="w-3 h-3 text-purple-500" />;
      case 'history':
        return <Clock className="w-3 h-3 text-gray-500" />;
      default:
        return <Lightbulb className="w-3 h-3 text-yellow-500" />;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          <div className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 text-sm flex items-start gap-2 ${
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                {getSuggestionIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{suggestion.label}</div>
                  {suggestion.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.description}
                    </div>
                  )}
                  {suggestion.value !== suggestion.label && (
                    <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      {suggestion.value}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 px-3 py-1 bg-gray-50 text-xs text-gray-500">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </div>
        </div>
      )}

      {/* Hint text */}
      {!showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute right-2 top-2 text-xs text-gray-400">
          Ctrl+Space for suggestions
        </div>
      )}
    </div>
  );
}
