/**
 * Video Timeline Clip Component
 * Displays video clips on the timeline with thumbnails, handles, and interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Trash2, GripVertical } from 'lucide-react';
import { useEditorStore } from './store';
import type { VideoClip, VideoAsset } from './types';

interface VideoTimelineClipProps {
  clip: VideoClip;
  asset: VideoAsset;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  reorderClips: (trackId: string, fromIndex: number, toIndex: number) => void;
  trackId: string;
  clips: VideoClip[];
}

export const VideoTimelineClip: React.FC<VideoTimelineClipProps> = ({
  clip,
  asset,
  pixelsPerSecond,
  isSelected,
  onSelect,
  reorderClips,
  trackId,
  clips,
}) => {
  const { updateClip, deleteClip, splitClip, currentTime } = useEditorStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 });

  const clipRef = useRef<HTMLDivElement>(null);

  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;

  // Check if playhead is over this clip
  const isAtPlayhead = currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration;

  // Handle clip drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return;
    e.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, time: clip.startTime });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStart.x;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = Math.max(0, dragStart.time + deltaTime);

      updateClip(clip.id, { startTime: newStartTime });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resize (trim) start
  const handleResizeStart = (e: React.MouseEvent, handle: 'left' | 'right') => {
    e.stopPropagation();
    onSelect();
    
    setIsResizing(handle);
    setDragStart({ x: e.clientX, time: clip.startTime });

    const originalDuration = clip.duration;
    const originalTrimStart = clip.trimStart;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStart.x;
      const deltaTime = deltaX / pixelsPerSecond;

      if (handle === 'left') {
        // Trim from start
        const newStartTime = Math.max(0, dragStart.time + deltaTime);
        const timeDiff = newStartTime - clip.startTime;
        const newDuration = Math.max(0.5, originalDuration - timeDiff);
        const newTrimStart = Math.max(0, originalTrimStart + timeDiff);

        if (newTrimStart < asset.duration) {
          updateClip(clip.id, {
            startTime: newStartTime,
            duration: newDuration,
            trimStart: newTrimStart,
          });
        }
      } else {
        // Trim from end
        const newDuration = Math.max(0.5, originalDuration + deltaTime);
        const newTrimEnd = Math.min(asset.duration, originalTrimStart + newDuration);

        if (newTrimEnd <= asset.duration) {
          updateClip(clip.id, {
            duration: newDuration,
            trimEnd: newTrimEnd,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle split at playhead
  const handleSplit = () => {
    if (isAtPlayhead) {
      splitClip(clip.id, currentTime);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (confirm('Delete this clip?')) {
      deleteClip(clip.id);
    }
  };

  return (
    <div
      ref={clipRef}
      style={{
        position: 'absolute',
        left: `${left}px`,
        width: `${width}px`,
        top: 0,
      }}
      className={`
        h-16 rounded cursor-move transition-all
        ${isSelected ? 'ring-2 ring-purple-500 shadow-lg z-20' : 'z-10'}
        ${isDragging ? 'opacity-70 scale-105' : 'opacity-100'}
        ${isAtPlayhead ? 'ring-2 ring-yellow-400' : ''}
        bg-gray-800 border border-gray-700 hover:border-gray-600
        overflow-hidden
      `}
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-clip-id', clip.id);
      }}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={e => {
        e.preventDefault();
        const fromClipId = e.dataTransfer.getData('application/x-clip-id');
        if (!fromClipId || fromClipId === clip.id) return;
        const fromIndex = clips.findIndex(c => c.id === fromClipId);
        const toIndex = clips.findIndex(c => c.id === clip.id);
        if (fromIndex === -1 || toIndex === -1) return;
        reorderClips(trackId, fromIndex, toIndex);
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Thumbnail Background */}
      {asset.thumbnail && (
        <div className="absolute inset-0 opacity-40">
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Clip Content */}
      <div className="relative h-full p-2 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">
              {asset.name}
            </p>
            <p className="text-xs text-gray-400">
              {clip.duration.toFixed(1)}s
            </p>
          </div>

          {/* Action Buttons */}
          {isSelected && (
            <div className="flex gap-1">
              {isAtPlayhead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSplit();
                  }}
                  className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
                  title="Split at playhead"
                >
                  <Scissors size={12} className="text-white" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                title="Delete clip"
              >
                <Trash2 size={12} className="text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Trim Indicator */}
        {(clip.trimStart > 0 || clip.trimEnd < asset.duration) && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Scissors size={10} />
            <span>Trimmed</span>
          </div>
        )}
      </div>

      {/* Resize Handles */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize
          hover:bg-purple-500 transition-colors
          ${isResizing === 'left' ? 'bg-purple-500' : 'bg-transparent'}
        `}
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize
          hover:bg-purple-500 transition-colors
          ${isResizing === 'right' ? 'bg-purple-500' : 'bg-transparent'}
        `}
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />

      {/* Drag Handle */}
      {isSelected && !isDragging && !isResizing && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <GripVertical size={16} className="text-white opacity-50" />
        </div>
      )}
    </div>
  );
};
