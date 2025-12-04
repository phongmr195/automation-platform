import { Trash2, Play, Archive, Copy, Download } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onExecute: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  onDelete,
  onExecute,
  onDuplicate,
  onExport,
  onClearSelection,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-2xl rounded-lg border border-gray-200 px-6 py-4 flex items-center gap-4 z-50 animate-slide-up">
      <div className="text-sm font-medium text-gray-700">
        {selectedCount} selected
      </div>
      <div className="h-6 w-px bg-gray-300" />
      
      <div className="flex gap-2">
        <button
          onClick={onExecute}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-md transition-colors"
          title="Execute selected workflows"
        >
          <Play className="w-4 h-4" />
          Execute
        </button>
        
        <button
          onClick={onDuplicate}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="Duplicate selected workflows"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="Export selected workflows"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete selected workflows"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
      
      <div className="h-6 w-px bg-gray-300" />
      
      <button
        onClick={onClearSelection}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Clear
      </button>
    </div>
  );
}
