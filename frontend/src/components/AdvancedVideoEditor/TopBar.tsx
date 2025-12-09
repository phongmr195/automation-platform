import React from 'react';
import {
  Play,
  Pause,
  Undo,
  Redo,
  Download,
  Upload,
  Save,
  FolderOpen,
  Settings,
  Maximize2,
} from 'lucide-react';
import { useEditorStore } from './store';

interface TopBarProps {
  onExport: () => void;
  onUploadVideo: () => void;
  onSave: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onExport, onUploadVideo, onSave }) => {
  const {
    playing,
    play,
    pause,
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    setZoom,
  } = useEditorStore();

  return (
    <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
      {/* Left: Logo & File Actions */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          🎬 <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Video Studio Pro
          </span>
        </h1>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onUploadVideo}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Upload Video"
          >
            <Upload size={18} />
            <span className="text-sm">Upload</span>
          </button>
          
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Save Project"
          >
            <Save size={18} />
          </button>
          
          <button
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Open Project"
          >
            <FolderOpen size={18} />
          </button>
        </div>
      </div>

      {/* Center: Playback & History Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (playing ? pause() : play())}
          className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        <div className="h-8 w-px bg-gray-700" />
        
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo"
        >
          <Undo size={20} />
        </button>
        
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo"
        >
          <Redo size={20} />
        </button>
        
        <div className="h-8 w-px bg-gray-700" />
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="px-2 py-1 text-gray-400 hover:text-white text-sm"
          >
            -
          </button>
          <span className="text-gray-400 text-sm min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            className="px-2 py-1 text-gray-400 hover:text-white text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* Right: Export & Settings */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
        
        <button
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={20} />
        </button>
        
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
        >
          <Download size={18} />
          Export
        </button>
      </div>
    </div>
  );
};
