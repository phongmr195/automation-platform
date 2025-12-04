import { Folder as FolderIcon, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

export interface Folder {
  id: string;
  name: string;
  workflowCount: number;
}

interface FolderListProps {
  folders: Folder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
}

export function FolderList({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
}: FolderListProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border-r border-gray-200 w-64 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${
              collapsed ? '' : 'rotate-90'
            }`}
          />
          Folders
        </button>
        <button
          onClick={onCreateFolder}
          className="p-1 hover:bg-gray-200 rounded"
          title="Create folder"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Folder List */}
      {!collapsed && (
        <div className="p-2">
          {/* All Workflows */}
          <button
            onClick={() => onSelectFolder(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              selectedFolder === null
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            <span className="flex-1 text-left">All Workflows</span>
            <span className="text-xs text-gray-500">
              {folders.reduce((sum, f) => sum + f.workflowCount, 0)}
            </span>
          </button>

          {/* Individual Folders */}
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mt-1 transition-colors ${
                selectedFolder === folder.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FolderIcon className="w-4 h-4" />
              <span className="flex-1 text-left truncate">{folder.name}</span>
              <span className="text-xs text-gray-500">
                {folder.workflowCount}
              </span>
            </button>
          ))}

          {folders.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No folders yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
