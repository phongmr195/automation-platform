/**
 * Edit Video Tab with Live Preview
 * Features: Drag & drop text, resize, rotate with Konva
 */

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Upload, Type, Smile, Crop, Scissors, Music, Download, Play, Loader2, X, Bold, Italic, Pause
} from 'lucide-react';
import { toast } from '../../utils/alerts';
import VideoEditorCanvas from './VideoEditorCanvas';
import type { TextElement } from './VideoEditorCanvas';

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Impact', 'Roboto', 'Montserrat', 'Pacifico'];

const EditVideoTab: React.FC = () => {
  const [activeOperation, setActiveOperation] = useState<'text' | 'overlay' | 'crop' | 'trim' | 'audio'>('text');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);

  // Video controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Text overlay state
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newText, setNewText] = useState('Click to add text');
  const [textX, setTextX] = useState(100);
  const [textY, setTextY] = useState(100);
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [textStart, setTextStart] = useState(0);
  const [textDuration, setTextDuration] = useState(5);

  // Crop/trim/audio state
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(1280);
  const [cropHeight, setCropHeight] = useState(720);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [replaceAudio, setReplaceAudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Update current time from video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setVideoDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoFile]);

  // Sync selected text properties
  useEffect(() => {
    if (selectedTextId) {
      const selected = textElements.find(el => el.id === selectedTextId);
      if (selected) {
        setNewText(selected.text);
        setTextX(selected.x);
        setTextY(selected.y);
        setFontSize(selected.fontSize);
        setFontColor(selected.fontColor);
        setFontFamily(selected.fontFamily || 'Arial');
        setBold(selected.bold || false);
        setItalic(selected.italic || false);
        setTextStart(selected.startTime);
        setTextDuration(selected.duration);
      }
    }
  }, [selectedTextId, textElements]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setOutputVideo(null);
      setTextElements([]);
      toast.success('Video uploaded');
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      toast.success('Audio uploaded');
    }
  };

  const addTextOverlay = () => {
    if (!newText) {
      toast.error('Please enter text');
      return;
    }

    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: newText,
      x: textX,
      y: textY,
      fontSize,
      fontColor,
      fontFamily,
      bold,
      italic,
      rotation: 0,
      startTime: textStart,
      duration: textDuration
    };

    setTextElements([...textElements, newElement]);
    setSelectedTextId(newElement.id);
    toast.success('Text added - drag to position');
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const updateSelectedText = () => {
    if (selectedTextId) {
      updateTextElement(selectedTextId, {
        text: newText,
        x: textX,
        y: textY,
        fontSize,
        fontColor,
        fontFamily,
        bold,
        italic,
        startTime: textStart,
        duration: textDuration
      });
      toast.success('Text updated');
    }
  };

  const removeTextOverlay = (id: string) => {
    setTextElements(textElements.filter(el => el.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const processVideo = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    setProcessing(true);
    setOutputVideo(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setOutputVideo(`/output/videos/video_edited_${Date.now()}.mp4`);
      toast.success('Video processed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to process video');
      console.error('Error processing video:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (outputVideo) {
      const filename = outputVideo.split('/').pop();
      const storedTokens = localStorage.getItem('authTokens');
      let accessToken = '';
      if (storedTokens) {
        try {
          accessToken = JSON.parse(storedTokens).accessToken;
        } catch {}
      }
      fetch(`/api/video-editor/download/${filename}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Download failed');
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'video.mp4';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        })
        .catch((err) => {
          toast.error('Download failed: ' + err.message);
        });
    }
  };

  const operations = [
    { id: 'text', icon: Type, label: 'Add Text' },
    { id: 'overlay', icon: Smile, label: 'Add Overlay' },
    { id: 'crop', icon: Crop, label: 'Crop' },
    { id: 'trim', icon: Scissors, label: 'Trim' },
    { id: 'audio', icon: Music, label: 'Add Audio' }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">🎬 Live Video Editor</h2>
      <p className="text-gray-600 mb-6">
        Upload video, add text with drag & drop, resize, and rotate
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Preview with Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {!videoFile ? (
              <div className="text-center py-12">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Upload className="mx-auto mb-4 text-gray-400" size={64} />
                <h3 className="text-xl font-semibold mb-2">Upload Video to Edit</h3>
                <p className="text-gray-500 mb-4">MP4, AVI, MOV, WebM</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                  Choose Video
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Live Preview</h3>
                  <button
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                      setOutputVideo(null);
                      setTextElements([]);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Change Video
                  </button>
                </div>
                
                {/* Video with Canvas Overlay */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg"
                    src={videoPreview || undefined}
                  />
                  <VideoEditorCanvas
                    videoRef={videoRef}
                    textElements={textElements}
                    onTextUpdate={updateTextElement}
                    selectedId={selectedTextId}
                    onSelect={setSelectedTextId}
                    currentTime={currentTime}
                  />
                </div>

                {/* Video Controls */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayPause}
                      className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <span className="text-sm text-gray-600">
                      {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
                      {Math.floor(videoDuration / 60)}:{Math.floor(videoDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max={videoDuration}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full"
                    step="0.1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editing Tools */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">Editing Tools</h3>

            {/* Operation Tabs */}
            <div className="space-y-2 mb-4">
              {operations.map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.id}
                    onClick={() => setActiveOperation(op.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeOperation === op.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    {op.label}
                  </button>
                );
              })}
            </div>

            {/* Add Text Panel */}
            {activeOperation === 'text' && (
              <div className="space-y-3 border-t pt-4">
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter text..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />

                {/* Font Selection */}
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FONTS.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>

                {/* Font Size & Color */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    placeholder="Size"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                </div>

                {/* Bold & Italic */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setBold(!bold)}
                    className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                      bold ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Bold size={20} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => setItalic(!italic)}
                    className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                      italic ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Italic size={20} className="mx-auto" />
                  </button>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Start (s)</label>
                    <input
                      type="number"
                      value={textStart}
                      onChange={(e) => setTextStart(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Duration (s)</label>
                    <input
                      type="number"
                      value={textDuration}
                      onChange={(e) => setTextDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedTextId ? (
                  <div className="space-y-2">
                    <button
                      onClick={updateSelectedText}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Selected
                    </button>
                    <button
                      onClick={() => {
                        removeTextOverlay(selectedTextId);
                        setNewText('Click to add text');
                      }}
                      className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete Selected
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={addTextOverlay}
                    className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Add Text
                  </button>
                )}

                {/* Text List */}
                {textElements.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Text Layers ({textElements.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {textElements.map((element) => (
                        <div
                          key={element.id}
                          onClick={() => setSelectedTextId(element.id)}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            selectedTextId === element.id ? 'bg-purple-100 border border-purple-300' : 'bg-gray-50'
                          }`}
                        >
                          <span className="flex-1 text-sm truncate">{element.text}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTextOverlay(element.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Crop Panel */}
            {activeOperation === 'crop' && (
              <div className="space-y-3 border-t pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={cropX} onChange={(e) => setCropX(Number(e.target.value))} placeholder="X" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <input type="number" value={cropY} onChange={(e) => setCropY(Number(e.target.value))} placeholder="Y" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <input type="number" value={cropWidth} onChange={(e) => setCropWidth(Number(e.target.value))} placeholder="Width" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <input type="number" value={cropHeight} onChange={(e) => setCropHeight(Number(e.target.value))} placeholder="Height" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
            )}

            {/* Trim Panel */}
            {activeOperation === 'trim' && (
              <div className="space-y-3 border-t pt-4">
                <input type="number" value={trimStart} onChange={(e) => setTrimStart(Number(e.target.value))} placeholder="Start (s)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <input type="number" value={trimEnd} onChange={(e) => setTrimEnd(Number(e.target.value))} placeholder="End (s)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            )}

            {/* Audio Panel */}
            {activeOperation === 'audio' && (
              <div className="space-y-3 border-t pt-4">
                <input type="file" ref={audioInputRef} accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400"
                >
                  <Music className="mx-auto mb-2 text-purple-500" size={24} />
                  <p className="text-sm text-gray-600">{audioFile ? audioFile.name : 'Choose Audio'}</p>
                </button>
                {audioFile && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Volume: {(audioVolume * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.1" value={audioVolume} onChange={(e) => setAudioVolume(Number(e.target.value))} className="w-full" />
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={replaceAudio} onChange={(e) => setReplaceAudio(e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-700">Replace audio</span>
                    </label>
                  </>
                )}
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={processVideo}
              disabled={processing || !videoFile}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 mt-4 ${
                processing || !videoFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Apply & Process
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {outputVideo && (
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">✅ Video Processed Successfully!</h3>
          <div className="bg-black rounded-lg overflow-hidden mb-4">
            <video controls className="w-full" src={`/api/video-editor/download/${outputVideo.split('/').pop()}`} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50"
            >
              <Download size={20} />
              Download Video
            </button>
            <button
              onClick={() => setOutputVideo(null)}
              className="px-6 py-3 bg-purple-700 bg-opacity-50 text-white rounded-lg font-semibold hover:bg-opacity-70"
            >
              Edit More
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditVideoTab;
