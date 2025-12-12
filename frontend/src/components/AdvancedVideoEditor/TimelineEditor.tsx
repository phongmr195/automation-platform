import React, { useRef, useState } from 'react';
import { useEditorStore } from './store';
import { Play, Pause, SkipBack, Film } from 'lucide-react';
import { VideoTimelineClip } from './VideoTimelineClip';

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
    // Video-related state
    videoTracks,
    videoAssets,
    selectedClipIds,
    selectClip,
    addClipToTrack,
    reorderClips,
  } = useEditorStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  const pixelsPerSecond = 50;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);
  const trackHeight = 48; // Increased height for animation bars
  const headerHeight = 40;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle click on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || draggingElement) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    seek(newTime);
  };

  // Handle element drag on timeline
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

  const animationColors: Record<string, string> = {
    fade: 'bg-blue-500',
    move: 'bg-green-500',
    scale: 'bg-yellow-500',
    rotate: 'bg-purple-500',
    bounce: 'bg-pink-500',
    textReveal: 'bg-cyan-500',
  };

  return (
    <div className="h-64 bg-gray-900 border-t border-gray-800 flex flex-col">
      {/* Controls */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Reset to 0s Button */}
          <button
            onClick={() => seek(0)}
            className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Reset to start (0s)"
          >
            <SkipBack size={18} />
          </button>
          <button
            className={`px-3 py-1 rounded ${playing ? 'bg-purple-600' : 'bg-gray-700'} text-white font-bold mr-2`}
            onClick={() => {
              console.log('[TimelineEditor] Play button clicked');
              if (playing) pause();
              else play();
            }}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Time Display */}
          <div className="text-white text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="text-gray-400 text-xs">
          {elements.length} elements | Click timeline to seek | Drag to move
        </div>
      </div>

      {/* Timeline - WITH vertical scroll */}
      <div 
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative bg-gray-950"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleTimelineClick}
        onDragOver={e => {
          if (e.dataTransfer.types.includes('application/x-video-asset-id')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={e => {
          const assetId = e.dataTransfer.getData('application/x-video-asset-id');
          if (!assetId) return;
          if (!timelineRef.current) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
          const dropTime = Math.max(0, x / pixelsPerSecond);
          // For now, always drop on first track (trackIndex 0)
          const trackIndex = 0;
          const asset = videoAssets.find(a => a.id === assetId);
          if (!asset) return;
          const clip = {
            id: `clip-${asset.id}-${Date.now()}`,
            assetId: asset.id,
            trackIndex,
            startTime: dropTime,
            duration: asset.duration,
            trimStart: 0,
            trimEnd: asset.duration,
            volume: 1,
            playbackRate: 1,
          };
          addClipToTrack(clip);
        }}
      >
        <div 
          style={{ 
            width: timelineWidth,
            minHeight: Math.max(elements.length * trackHeight + headerHeight + 20, 200)
          }}
          className="relative"
        >
          {/* Time Ruler */}
          <div className="h-10 border-b border-gray-800 flex items-center relative bg-gray-900 sticky top-0 z-20">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div
                key={i}
                style={{ left: i * pixelsPerSecond }}
                className="absolute flex flex-col items-start"
              >
                <div className="w-px h-2 bg-gray-700"></div>
                <span className="text-xs text-gray-600 ml-1">{i}s</span>
              </div>
            ))}
          </div>

          {/* Video Tracks Section */}
          {videoTracks.length > 0 && (
            <div className="relative mb-6">
              <div className="bg-gray-900/50 p-2 border-b border-gray-800 flex items-center gap-2">
                <Film size={14} className="text-purple-400" />
                <span className="text-xs text-gray-400 font-medium">Video Tracks</span>
              </div>
              {videoTracks.map((track) => (
                <div
                  key={track.id}
                  className="relative h-20 border-b border-gray-800 bg-gray-950/50"
                >
                  {/* Track Label */}
                  <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-900 border-r border-gray-800 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{track.name}</span>
                  </div>

                  {/* Track Content (Clips) */}
                  <div className="absolute left-24 right-0 top-2 bottom-2">
                    {track.clips.map((clip) => {
                      const asset = videoAssets.find((a) => a.id === clip.assetId);
                      if (!asset) return null;

                      return (
                        <VideoTimelineClip
                          key={clip.id}
                          clip={clip}
                          asset={asset}
                          pixelsPerSecond={pixelsPerSecond}
                          isSelected={selectedClipIds.includes(clip.id)}
                          onSelect={() => selectClip(clip.id)}
                          reorderClips={reorderClips}
                          trackId={track.id}
                          clips={track.clips}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Element Tracks with Animation Bars */}
          <div className="relative" style={{ minHeight: elements.length * trackHeight + 20 }}>
            {elements.map((element, index) => {
              const left = element.startTime * pixelsPerSecond;
              const width = element.duration * pixelsPerSecond;
              const top = index * trackHeight + 12;
              const isSelected = selectedIds.includes(element.id);
              const isDragging = draggingElement === element.id;

              const colors = {
                text: 'bg-blue-600',
                image: 'bg-green-600',
                shape: 'bg-yellow-600',
                video: 'bg-purple-600',
                audio: 'bg-pink-600',
              };

              const animations = element.animations || [];
              const hasAnimations = animations.length > 0;

              return (
                <div
                  key={element.id}
                  className="relative"
                  style={{ height: trackHeight }}
                >
                  {/* Main Element Bar */}
                  <div
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      top: `${top}px`,
                    }}
                    className={`absolute h-7 rounded cursor-move transition-all ${
                      colors[element.type] || 'bg-gray-600'
                    } ${isSelected ? 'ring-2 ring-white shadow-lg' : ''} ${
                      isDragging ? 'opacity-70 scale-105 z-30' : 'opacity-90 hover:opacity-100 hover:shadow-lg z-10'
                    }`}
                    onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(element.id);
                    }}
                  >
                    <div className="px-2 py-1 text-white text-xs truncate font-medium flex items-center gap-1">
                      <span className="opacity-70">{index + 1}.</span>
                      {element.type === 'text' && (element as any).text
                        ? (element as any).text.substring(0, 30)
                        : `${element.type.charAt(0).toUpperCase() + element.type.slice(1)}`}
                      {hasAnimations && <span className="ml-1">🎬</span>}
                    </div>
                  </div>

                  {/* Animation Bars */}
                  {animations.length > 0 && (
                    <div
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        top: `${top + 28}px`,
                      }}
                      className="absolute h-4 flex gap-0.5"
                    >
                      {animations.map((anim) => {
                        const animLeft = (anim.startTime - element.startTime) * pixelsPerSecond;
                        const animWidth = anim.duration * pixelsPerSecond;
                        const colorClass = animationColors[anim.type] || 'bg-gray-500';

                        return (
                          <div
                            key={anim.id}
                            style={{
                              left: `${animLeft}px`,
                              width: `${animWidth}px`,
                            }}
                            className={`absolute h-3 ${colorClass} rounded-sm opacity-70 hover:opacity-100 transition-opacity border border-gray-700`}
                            title={`${anim.type} (${anim.startTime.toFixed(1)}s - ${(anim.startTime + anim.duration).toFixed(1)}s)`}
                          >
                            <span className="text-[8px] text-white px-1 opacity-80 capitalize">
                              {anim.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Playhead - higher z-index */}
          <div
            style={{ left: currentTime * pixelsPerSecond }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-40"
          >
            <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
            <div className="absolute top-10 left-0 w-px h-full bg-red-500"></div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="h-8 px-4 py-1 bg-gray-900 border-t border-gray-800 flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span>Animation colors:</span>
          <div className="flex gap-2">
            {Object.entries(animationColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded ${color}`}></div>
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
