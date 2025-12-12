import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { TopBar } from './TopBar';
import { ToolsPanel } from './ToolsPanel';
import { CanvasEditor } from './CanvasEditor';
import { PropertiesPanel } from './PropertiesPanel';
import { TimelineEditor } from './TimelineEditor';
import { useEditorStore } from './store';
import { toast } from '../../utils/alerts';
import { VideoSequencer } from './videoSequencer';

const API_BASE = 'http://localhost:3000';

export const AdvancedVideoEditor: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sequencerRef = useRef<VideoSequencer | null>(null);
  const [exporting, setExporting] = useState(false);

  const { 
    setVideoSrc, 
    setDuration, 
    elements, 
    currentTime,
    duration,
    playing,
    play,
    pause,
    seek,
    videoSrc,
    videoTracks,
    videoAssets,
    setActiveVideoClip,
  } = useEditorStore();

  // Initialize video sequencer
  useEffect(() => {
    if (!videoRef.current) return;
    console.log('[AdvancedVideoEditor] useEffect: videoRef.current changed:', videoRef.current);
    const sequencer = new VideoSequencer(videoRef.current, {
      onTimeUpdate: (time) => seek(time),
      onPlayStateChange: (isPlaying) => {
        if (isPlaying) play();
        else pause();
      },
      onClipChange: (clip) => setActiveVideoClip(clip),
    });
    sequencerRef.current = sequencer;
    console.log('[AdvancedVideoEditor] sequencerRef.current set', sequencerRef.current);
    return () => {
      sequencer.destroy();
      sequencerRef.current = null;
    };
  }, [videoRef.current]);

  // Update sequencer when video clips or assets change
  useEffect(() => {
    if (!sequencerRef.current) return;

    const allClips = videoTracks.flatMap((track) => track.clips);
    sequencerRef.current.updateClips(allClips, videoAssets);

    // Update duration based on last clip
    if (allClips.length > 0) {
      const maxTime = Math.max(
        ...allClips.map((clip) => clip.startTime + clip.duration),
        duration
      );
      setDuration(maxTime);
    }
  }, [videoTracks, videoAssets, duration, setDuration]);

  // Handle play/pause from sequencer
  // Only trigger play when both playing is true and sequencerRef.current is set
  useEffect(() => {
    console.log('[AdvancedVideoEditor] useEffect([playing, sequencerRef.current]) fired. playing:', playing, 'sequencerRef.current:', sequencerRef.current);
    if (!sequencerRef.current) return;

    if (playing) {
      sequencerRef.current.play(currentTime);
    } else {
      sequencerRef.current.pause();
    }
  }, [playing, sequencerRef.current, currentTime]);

  // If sequencerRef.current is set after playing is already true, trigger play immediately
  useEffect(() => {
    if (sequencerRef.current && playing) {
      console.log('[AdvancedVideoEditor] sequencerRef became available while playing=true, triggering play from currentTime', currentTime);
      sequencerRef.current.play(currentTime);
    }
  }, [sequencerRef.current, playing, currentTime]);

  // Handle seek from timeline (when not playing)
  useEffect(() => {
    if (!sequencerRef.current || playing) return;
    const allClips = videoTracks.flatMap((track) => track.clips);
    if (allClips.length > 0) {
      sequencerRef.current.seek(currentTime);
    }
  }, [currentTime, playing, videoTracks]);

  // Update timeline when playing without video clips (elements only)
  useEffect(() => {
    const allClips = videoTracks.flatMap((track) => track.clips);
    if (allClips.length > 0 || !playing) return; // Only run when no video clips

    let animationFrame: number;
    let lastTime = performance.now();

    const updateTime = () => {
      const now = performance.now();
      const deltaTime = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;

      const newTime = currentTime + deltaTime;

      if (newTime >= duration) {
        pause();
        seek(duration);
      } else {
        seek(newTime);
        animationFrame = requestAnimationFrame(updateTime);
      }
    };

    animationFrame = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [playing, currentTime, duration, videoTracks, seek, pause]);

  const handleUploadVideo = () => {
    fileInputRef.current?.click();
  };

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoSrc(url);

    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setDuration(tempVideo.duration);
      toast.success(`Video loaded! Duration: ${tempVideo.duration.toFixed(1)}s`);
    };
  };

  const handleExport = async () => {
    if (elements.length === 0) {
      toast.error('Please add some elements (text, images, shapes) first!');
      return;
    }

    if (!videoSrc) {
      toast.info('📸 Creating video from images and text...');
    } else {
      toast.info('🎬 Exporting video with effects...');
    }

    setExporting(true);

    try {
      const exportData = {
        videoSrc: (videoSrc && !videoSrc.startsWith('blob:')) ? videoSrc : null,
        elements: elements.map(el => ({
          ...el,
          src: el.type === 'image' ? (el as any).src : undefined,
        })),
        canvasWidth: useEditorStore.getState().canvasWidth,
        canvasHeight: useEditorStore.getState().canvasHeight,
        duration: useEditorStore.getState().duration,
        backgroundColor: 'white',
      };

      console.log('🎬 Sending export request...');

      const response = await axios.post(`${API_BASE}/video-export/export`, exportData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000,
      });

      if (response.data.success) {
        toast.success('✅ Video exported successfully!');

        const downloadUrl = `${API_BASE}${response.data.url}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`📥 Downloading: ${response.data.filename}`);
      } else {
        throw new Error(response.data.message || 'Export failed');
      }

    } catch (error: any) {
      console.error('❌ Export error:', error);

      if (error.response?.data?.message) {
        toast.error(`Export failed: ${error.response.data.message}`);
      } else if (error.message.includes('timeout')) {
        toast.error('Export timeout. Video might be too long.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to backend. Is it running?');
      } else {
        toast.error('Export failed. Check console.');
      }

      toast.info('💾 Saving as JSON instead...');
      const dataStr = JSON.stringify({
        elements,
        canvasWidth: useEditorStore.getState().canvasWidth,
        canvasHeight: useEditorStore.getState().canvasHeight,
        duration: useEditorStore.getState().duration,
        videoSrc: videoSrc,
      }, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `video-project-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('✅ Project saved as JSON');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = () => {
    const projectData = {
      elements: useEditorStore.getState().elements,
      canvasWidth: useEditorStore.getState().canvasWidth,
      canvasHeight: useEditorStore.getState().canvasHeight,
      duration: useEditorStore.getState().duration,
      videoSrc: useEditorStore.getState().videoSrc,
    };

    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `video-project-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Project saved!');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoFile}
        className="hidden"
      />

      {/* Top Bar */}
      <TopBar
        onExport={handleExport}
        onUploadVideo={handleUploadVideo}
        onSave={handleSave}
      />

      {/* Main Content Area - FIXED: ensure all panels visible */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Tools Panel - FIXED: always visible */}
        <div className="flex-shrink-0">
          <ToolsPanel />
        </div>

        {/* Center: Canvas Editor + Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          <CanvasEditor videoRef={videoRef} />
          <TimelineEditor />
        </div>

        {/* Right: Properties Panel - FIXED: always visible */}
        <div className="flex-shrink-0">
          <PropertiesPanel />
        </div>
      </div>

      {/* Export Modal */}
      {exporting && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
              <h3 className="text-white text-xl font-bold mb-2">
                {videoSrc ? 'Exporting Video...' : 'Creating Video...'}
              </h3>
              <p className="text-gray-400">
                {videoSrc ? 'Adding effects to video' : 'Building video from images & text'}
              </p>
              <p className="text-gray-500 text-sm mt-2">This may take 1-3 minutes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedVideoEditor;
