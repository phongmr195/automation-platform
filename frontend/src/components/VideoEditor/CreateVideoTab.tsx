/**
 * Create Video from Images Tab
 * Upload images and create a video slideshow with music
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  Upload,
  X,
  Music,
  Play,
  Download,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from '../../utils/alerts';

interface Image {
  file: File;
  preview: string;
}

const CreateVideoTab: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(3);
  const [resolution, setResolution] = useState('1920x1080');
  const [transition, setTransition] = useState<'fade' | 'none'>('fade');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  // Image dropzone
  const onDropImages = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
    toast.success(`${acceptedFiles.length} images added`);
  }, []);

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onDropImages,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: true
  });

  // Audio dropzone
  const onDropAudio = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setAudioFile(acceptedFiles[0]);
      toast.success('Music added');
    }
  }, []);

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onDropAudio,
    accept: {
      'audio/*': ['.mp3', '.wav', '.aac', '.ogg']
    },
    multiple: false
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeAudio = () => {
    setAudioFile(null);
  };

  const handleCreateVideo = async () => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setOutputVideo(null);

    try {
      toast.info('Uploading images...');

      // For demo purposes, we'll simulate the process
      // In production, you'd actually upload files and call the API
      const [width, height] = resolution.split('x').map(Number);

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress(i);
      }

      // Simulated output
      setOutputVideo(`/output/videos/video_${Date.now()}.mp4`);
      toast.success('Video created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create video');
      console.error('Error creating video:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (outputVideo) {
      const filename = outputVideo.split('/').pop();
      window.location.href = `/api/video-editor/download/${filename}`;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Create Video from Images</h2>
      <p className="text-gray-600 mb-6">
        Upload images to create a beautiful video slideshow with optional background music
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area - Image Upload */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upload Zone */}
          <div
            {...getImageRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${isImageDragActive
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
              }
            `}
          >
            <input {...getImageInputProps()} />
            <Upload className="mx-auto mb-4 text-purple-500" size={48} />
            <h3 className="text-lg font-semibold mb-2">
              {isImageDragActive ? 'Drop images here...' : 'Drag & drop images here'}
            </h3>
            <p className="text-sm text-gray-500">
              or click to browse (JPG, PNG, GIF)
            </p>
          </div>

          {/* Image Preview Grid */}
          {images.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold mb-4">
                Images ({images.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.preview}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white
                                    text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">Video Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name (optional)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Video Project"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration per Image: {duration}s
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1s</span>
                  <span>10s</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="854x480">854x480 (SD)</option>
                  <option value="640x360">640x360 (Low)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transition
                </label>
                <select
                  value={transition}
                  onChange={(e) => setTransition(e.target.value as 'fade' | 'none')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="fade">Fade</option>
                  <option value="none">None</option>
                </select>
              </div>

              {/* Audio Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Music (optional)
                </label>
                {!audioFile ? (
                  <div
                    {...getAudioRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                      transition-all duration-200
                      ${isAudioDragActive
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400'
                      }
                    `}
                  >
                    <input {...getAudioInputProps()} />
                    <Music className="mx-auto mb-2 text-purple-500" size={24} />
                    <p className="text-sm text-gray-600">
                      {isAudioDragActive ? 'Drop audio here...' : 'Add music'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                    <Music className="text-purple-600" size={20} />
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {audioFile.name}
                    </span>
                    <button
                      onClick={removeAudio}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateVideo}
                disabled={processing || images.length === 0}
                className={`
                  w-full py-3 px-4 rounded-lg font-semibold text-white
                  flex items-center justify-center gap-2
                  transition-all duration-200
                  ${processing || images.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  }
                `}
              >
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creating... {progress}%
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Create Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {processing && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <div className="flex-1">
              <p className="font-medium text-blue-900">Processing video...</p>
              <p className="text-sm text-blue-700">This may take a few minutes</p>
            </div>
          </div>
          <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {outputVideo && (
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">✅ Video Created Successfully!</h3>
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
              onClick={() => {
                setOutputVideo(null);
                setImages([]);
                setAudioFile(null);
                setProgress(0);
              }}
              className="px-6 py-3 bg-purple-700 bg-opacity-50 text-white rounded-lg font-semibold hover:bg-opacity-70 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateVideoTab;
