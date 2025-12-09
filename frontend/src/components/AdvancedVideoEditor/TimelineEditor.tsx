import React, { useRef, useState } from 'react';
import { useEditorStore } from './store';
import { Play, Pause } from 'lucide-react';

export const TimelineEditor: React.FC = () => {
  const {
    elements,
    currentTime,
    duration,
    playing,
    play,
    pause,
    seek,
    selectedIds,
    selectElement,
    updateElement,
  } = useEditorStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  
  const pixelsPerSecond = 100;

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (draggingElement) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    seek(Math.max(0, Math.min(duration, time)));
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setDraggingElement(elementId);
    setDragStartX(e.clientX);
    const element = elements.find(el => el.id === elementId);
    if (element) {
      setDragStartTime(element.startTime);
    }
    selectElement(elementId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerSecond;
    const newStartTime = Math.max(0, dragStartTime + deltaTime);
    
    updateElement(draggingElement, { startTime: newStartTime });
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div 
      className="h-64 bg-gray-900 border-t border-gray-800 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Timeline Header */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={() => (playing ? pause() : play())}
          className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <span className="text-white text-sm font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        
        <div className="flex-1" />
        
        <span className="text-gray-400 text-xs">
          {elements.length} elements | Drag elements to move in time
        </span>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layer Names */}
        <div className="w-40 bg-gray-900 border-r border-gray-800 overflow-y-auto">
          <div className="h-8 border-b border-gray-800 flex items-center px-3">
            <span className="text-gray-400 text-xs font-medium">LAYERS</span>
          </div>
          {elements.map((element) => (
            <div
              key={element.id}
              onClick={() => selectElement(element.id)}
              className={`h-12 border-b border-gray-800 flex items-center px-3 cursor-pointer hover:bg-gray-800 ${
                selectedIds.includes(element.id) ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${
                  element.type === 'text' ? 'bg-purple-500' :
                  element.type === 'image' ? 'bg-blue-500' :
                  'bg-green-500'
                }`} />
                <span className="text-white text-sm truncate">
                  {element.type === 'text' && '📝'}
                  {element.type === 'image' && '🖼️'}
                  {element.type === 'shape' && '🔷'}
                  {' '}
                  {element.type} {element.id.split('-')[1]?.slice(0, 4)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 overflow-auto relative" ref={timelineRef}>
          {/* Time Ruler */}
          <div className="h-8 bg-gray-800 border-b border-gray-700 relative">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-gray-700"
                style={{ left: i * pixelsPerSecond }}
              >
                <span className="absolute top-1 left-1 text-gray-500 text-[10px]">
                  {i}s
                </span>
              </div>
            ))}
          </div>

          {/* Element Tracks */}
          <div className="relative" onClick={handleTimelineClick}>
            {elements.map((element) => {
              const left = element.startTime * pixelsPerSecond;
              const width = element.duration * pixelsPerSecond;
              const isSelected = selectedIds.includes(element.id);
              const isDragging = draggingElement === element.id;

              return (
                <div
                  key={element.id}
                  className="h-12 border-b border-gray-800 relative"
                >
                  <div
                    className={`absolute top-2 h-8 rounded cursor-move ${
                      isSelected ? 'ring-2 ring-purple-500' : ''
                    } ${isDragging ? 'opacity-70' : ''}`}
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      backgroundColor: 
                        element.type === 'text' ? '#8B5CF6' : 
                        element.type === 'image' ? '#3B82F6' :
                        element.type === 'shape' ? '#10B981' : '#6B7280',
                      opacity: 0.8,
                    }}
                    onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                  >
                    <div className="px-2 py-1 text-white text-xs truncate flex items-center justify-between">
                      <span>{element.type}</span>
                      <span className="text-[10px] opacity-70">{element.duration.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-50"
            style={{ left: currentTime * pixelsPerSecond }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 -mt-1" />
          </div>

          {/* Time Grid */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.ceil(duration) * 10 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-gray-800"
                style={{ left: (i * pixelsPerSecond) / 10 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
