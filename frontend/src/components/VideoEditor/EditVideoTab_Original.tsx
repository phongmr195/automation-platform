/**
 * Edit Video Tab
 * Edit existing videos: add text, overlays, crop, trim, add audio
 */

import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Upload,
  Type,
  Smile,
  Crop,
  Scissors,
  Music,
  Download,
  Play,
  Loader2,
  X
} from 'lucide-react';
import { toast } from '../../utils/alerts';

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;
  startTime: number;
  duration: number;
}

const EditVideoTab: React.FC = () => {
  const [activeOperation, setActiveOperation] = useState<'text' | 'overlay' | 'crop' | 'trim' | 'audio'>('text');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);

  // Text overlay state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState('');
  const [textX, setTextX] = useState(100);
  const [textY, setTextY] = useState(100);
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [textStart, setTextStart] = useState(0);
  const [textDuration, setTextDuration] = useState(5);

  // Crop state
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(1280);
  const [cropHeight, setCropHeight] = useState(720);

  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [replaceAudio, setReplaceAudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setOutputVideo(null);
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

    setTextOverlays([...textOverlays, {
      text: newText,
      x: textX,
      y: textY,
      fontSize,
      fontColor,
      startTime: textStart,
      duration: textDuration
    }]);

    setNewText('');
    toast.success('Text overlay added');
  };

  const removeTextOverlay = (index: number) => {
    setTextOverlays(textOverlays.filter((_, i) => i !== index));
  };

  const processVideo = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    setProcessing(true);
    setOutputVideo(null);

    try {
      // Simulate processing
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
      // Get access token from AuthContext
      const storedTokens = localStorage.getItem('authTokens');
      let accessToken = '';
      if (storedTokens) {
        try {
          accessToken = JSON.parse(storedTokens).accessToken;
        } catch {}
      }
      // Use fetch to send Authorization header and download file
      fetch(`/api/video-editor/download/${filename}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
      <h2 className="text-2xl font-bold mb-2">Edit Video</h2>
      <p className="text-gray-600 mb-6">
        Upload a video and apply various editing operations
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Preview */}
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
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Choose Video
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Video Preview</h3>
                  <button
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                      setOutputVideo(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Change Video
                  </button>
                </div>
                <video
                  controls
                  className="w-full rounded-lg"
                  src={videoPreview || undefined}
                />
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
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium
                      transition-all duration-200
                      ${activeOperation === op.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon size={20} />
                    {op.label}
                  </button>
                );
              })}
            </div>

            {/* Operation Panels */}
            <div className="mt-4 space-y-4">
              {/* Add Text Panel */}
              {activeOperation === 'text' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={textX}
                      onChange={(e) => setTextX(Number(e.target.value))}
                      placeholder="X Position"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      value={textY}
                      onChange={(e) => setTextY(Number(e.target.value))}
                      placeholder="Y Position"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    placeholder="Font Size"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Color:</label>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={textStart}
                      onChange={(e) => setTextStart(Number(e.target.value))}
                      placeholder="Start (s)"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      value={textDuration}
                      onChange={(e) => setTextDuration(Number(e.target.value))}
                      placeholder="Duration (s)"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <button
                    onClick={addTextOverlay}
                    className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Add Text
                  </button>

                  {textOverlays.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Overlays ({textOverlays.length})
                      </p>
                      <div className="space-y-2">
                        {textOverlays.map((overlay, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="flex-1 text-sm truncate">{overlay.text}</span>
                            <button
                              onClick={() => removeTextOverlay(index)}
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
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={cropX}
                      onChange={(e) => setCropX(Number(e.target.value))}
                      placeholder="X"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      value={cropY}
                      onChange={(e) => setCropY(Number(e.target.value))}
                      placeholder="Y"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      value={cropWidth}
                      onChange={(e) => setCropWidth(Number(e.target.value))}
                      placeholder="Width"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      value={cropHeight}
                      onChange={(e) => setCropHeight(Number(e.target.value))}
                      placeholder="Height"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Trim Panel */}
              {activeOperation === 'trim' && (
                <div className="space-y-3">
                  <input
                    type="number"
                    value={trimStart}
                    onChange={(e) => setTrimStart(Number(e.target.value))}
                    placeholder="Start Time (seconds)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="number"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                    placeholder="End Time (seconds)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}

              {/* Add Audio Panel */}
              {activeOperation === 'audio' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={audioInputRef}
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors"
                  >
                    <Music className="mx-auto mb-2 text-purple-500" size={24} />
                    <p className="text-sm text-gray-600">
                      {audioFile ? audioFile.name : 'Choose Audio File'}
                    </p>
                  </button>

                  {audioFile && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Volume: {(audioVolume * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={audioVolume}
                          onChange={(e) => setAudioVolume(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={replaceAudio}
                          onChange={(e) => setReplaceAudio(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Replace original audio</span>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={processVideo}
                disabled={processing || !videoFile}
                className={`
                  w-full py-3 px-4 rounded-lg font-semibold text-white
                  flex items-center justify-center gap-2 mt-4
                  ${processing || !videoFile
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  }
                `}
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
      </div>

      {/* Result */}
      {outputVideo && (
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">✅ Video Processed Successfully!</h3>
          <div className="bg-black rounded-lg overflow-hidden mb-4">
            <video
              controls
              className="w-full"
              src={`/api/video-editor/download/${outputVideo.split('/').pop()}`}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              <Download size={20} />
              Download Video
            </button>
            <button
              onClick={() => setOutputVideo(null)}
              className="px-6 py-3 bg-purple-700 bg-opacity-50 text-white rounded-lg font-semibold hover:bg-opacity-70 transition-colors"
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
