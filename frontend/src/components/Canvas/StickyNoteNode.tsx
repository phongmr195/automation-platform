import { useState } from 'react';
import { StickyNote, X } from 'lucide-react';

export interface StickyNoteData {
  content: string;
  color: string;
  onUpdate?: (id: string, content: string, color: string) => void;
  onDelete?: (id: string) => void;
}

const COLORS = [
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Green', value: '#d1fae5' },
  { name: 'Purple', value: '#e9d5ff' },
];

interface StickyNoteNodeProps {
  id: string;
  data: StickyNoteData;
}

export default function StickyNoteNode({ id, data }: StickyNoteNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content || '');
  const [selectedColor, setSelectedColor] = useState(data.color || '#fef3c7');

  const handleSave = () => {
    if (data.onUpdate) {
      data.onUpdate(id, content, selectedColor);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (data.onUpdate && !isEditing) {
      data.onUpdate(id, content, color);
    }
  };

  return (
    <div
      className="sticky-note nodrag"
      style={{
        backgroundColor: selectedColor,
        minWidth: '200px',
        minHeight: '150px',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <StickyNote className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">Note</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Color picker */}
          <div className="flex gap-1">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className="w-4 h-4 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{
                  backgroundColor: color.value,
                  outline: selectedColor === color.value ? '2px solid #3b82f6' : 'none',
                }}
                title={color.name}
              />
            ))}
          </div>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-black/10 rounded transition-colors"
          >
            <X className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-24 p-2 text-sm bg-white/50 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write a note..."
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setContent(data.content || '');
                setIsEditing(false);
              }}
              className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="text-sm text-gray-700 cursor-text whitespace-pre-wrap min-h-[60px] hover:bg-white/30 p-2 rounded transition-colors"
        >
          {content || <span className="text-gray-400 italic">Click to add note...</span>}
        </div>
      )}
    </div>
  );
}
