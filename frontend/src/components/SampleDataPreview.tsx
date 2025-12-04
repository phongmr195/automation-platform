import { useState } from 'react';
import { Eye, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface SampleDataPreviewProps {
  nodeType: string;
  parameters: Record<string, any>;
}

interface SampleData {
  input?: any;
  output?: any;
  description: string;
}

// Sample data for different node types
const SAMPLE_DATA: Record<string, SampleData> = {
  'http-request': {
    description: 'Sample HTTP response',
    output: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
      },
      data: {
        id: 1,
        name: 'Sample User',
        email: 'user@example.com',
      },
    },
  },
  'telegram-send': {
    description: 'Message sent successfully',
    output: {
      ok: true,
      result: {
        message_id: 12345,
        chat: {
          id: -1001234567890,
          type: 'channel',
        },
        date: 1701700000,
        text: 'Your message here',
      },
    },
  },
  'transform': {
    description: 'Transformed data',
    input: {
      name: 'John Doe',
      age: 30,
      city: 'New York',
    },
    output: {
      fullName: 'JOHN DOE',
      isAdult: true,
      location: 'New York, USA',
    },
  },
  'google-sheets': {
    description: 'Spreadsheet data',
    output: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:D10',
      values: [
        ['Name', 'Email', 'Age', 'City'],
        ['John Doe', 'john@example.com', 30, 'New York'],
        ['Jane Smith', 'jane@example.com', 25, 'Los Angeles'],
      ],
    },
  },
  'notion': {
    description: 'Notion page data',
    output: {
      object: 'page',
      id: 'abc123-def456',
      properties: {
        Name: {
          title: [
            {
              text: {
                content: 'Sample Page',
              },
            },
          ],
        },
        Status: {
          select: {
            name: 'Done',
          },
        },
      },
    },
  },
  'trello': {
    description: 'Trello card data',
    output: {
      id: 'abc123def456',
      name: 'Sample Card',
      desc: 'This is a sample card description',
      idList: 'list123',
      labels: [
        { name: 'Priority', color: 'red' },
      ],
      due: '2024-12-31',
    },
  },
  'mysql': {
    description: 'Query results',
    output: {
      rows: [
        { id: 1, name: 'Product A', price: 29.99 },
        { id: 2, name: 'Product B', price: 49.99 },
        { id: 3, name: 'Product C', price: 19.99 },
      ],
      affectedRows: 3,
    },
  },
  'mongodb': {
    description: 'Document results',
    output: {
      documents: [
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1', status: 'active' },
        { _id: '507f1f77bcf86cd799439012', name: 'Item 2', status: 'pending' },
      ],
      count: 2,
    },
  },
};

export default function SampleDataPreview({ nodeType }: SampleDataPreviewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const sampleData = SAMPLE_DATA[nodeType];

  if (!sampleData) {
    return null;
  }

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (value: any, path: string = '', level: number = 0): JSX.Element => {
    if (value === null) {
      return <span className="text-purple-600">null</span>;
    }

    if (value === undefined) {
      return <span className="text-gray-400">undefined</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-orange-600">{String(value)}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-green-600">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const isExpanded = expanded[path];
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="inline-flex items-center gap-1 hover:bg-gray-100 rounded px-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-gray-600">[{value.length}]</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-gray-200 pl-3 mt-1">
              {value.map((item, index) => (
                <div key={index} className="py-0.5">
                  <span className="text-gray-500">{index}:</span>{' '}
                  {renderValue(item, `${path}.${index}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expanded[path];
      const keys = Object.keys(value);
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="inline-flex items-center gap-1 hover:bg-gray-100 rounded px-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-gray-600">{'{}'} {keys.length} keys</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-gray-200 pl-3 mt-1">
              {keys.map((key) => (
                <div key={key} className="py-0.5">
                  <span className="text-blue-700 font-medium">{key}:</span>{' '}
                  {renderValue(value[key], `${path}.${key}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Sample Data Preview</span>
          </div>
          <button
            onClick={() => copyToClipboard(sampleData.output)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-600 mt-1">{sampleData.description}</div>
      </div>

      {/* Content */}
      <div className="p-3 bg-white">
        {sampleData.input && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-700 mb-1">Input:</div>
            <div className="text-sm font-mono bg-gray-50 border border-gray-200 rounded p-2">
              {renderValue(sampleData.input, 'input')}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">Output:</div>
          <div className="text-sm font-mono bg-gray-50 border border-gray-200 rounded p-2 max-h-64 overflow-y-auto">
            {renderValue(sampleData.output, 'output')}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
        💡 This is sample data. Actual output may vary based on your configuration.
      </div>
    </div>
  );
}
