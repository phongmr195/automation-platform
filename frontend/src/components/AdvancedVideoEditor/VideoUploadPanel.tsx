/**
 * Video Upload Panel Component
 * Supports drag-and-drop, multiple file uploads, thumbnail extraction
 */

import React, { useRef, useState, useCallback } from 'react';
import { Upload, Video, X, Check, Loader2, Film } from 'lucide-react';
import { useEditorStore } from './store';
import type { VideoAsset, VideoClip } from './types';
import { toast } from '../../utils/alerts';

interface VideoFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export const VideoUploadPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<VideoFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { addVideoAsset, addVideoTrack, addClipToTrack, videoTracks, videoAssets } = useEditorStore();

  // Extract video metadata and thumbnail
  const extractVideoMetadata = useCallback((file: File): Promise<VideoAsset> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'metadata';
      video.muted = true;

      video.onloadedmetadata = () => {
        // Extract thumbnail at 0.5s
        video.currentTime = Math.min(0.5, video.duration / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');

          ctx.drawImage(video, 0, 0);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

          const asset: VideoAsset = {
            id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            src: url,
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnail,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
          };

          resolve(asset);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      video.src = url;
    });
  }, []);

  // Process uploaded files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const videoFiles = fileArray.filter((f) => f.type.startsWith('video/'));

    if (videoFiles.length === 0) {
      toast.error('Please select video files');
      return;
    }

    // Initialize upload tracking
    const uploadFiles: VideoFile[] = videoFiles.map((file) => ({
      file,
      id: `upload-${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'pending',
    }));

    setUploadingFiles(uploadFiles);

    // Process each file
    for (let i = 0; i < uploadFiles.length; i++) {
      const uploadFile = uploadFiles[i];

      try {
        // Update status to processing
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'processing', progress: 30 } : f
          )
        );

        // Extract metadata and thumbnail
        const asset = await extractVideoMetadata(uploadFile.file);

        // Update progress
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress: 70 } : f
          )
        );

        // Add to store
        addVideoAsset(asset);

        // Auto-create track if none exist
        let trackId = videoTracks.length > 0 ? videoTracks[0].id : null;
        if (!trackId) {
          trackId = addVideoTrack();
        }

        // Calculate start time (after last clip on track)
        const track = videoTracks.find((t) => t.id === trackId);
        const lastClip = track?.clips[track.clips.length - 1];
        const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;

        // Create clip and add to timeline
        const clip: VideoClip = {
          id: `clip-${asset.id}`,
          assetId: asset.id,
          trackIndex: 0,
          startTime,
          duration: asset.duration,
          trimStart: 0,
          trimEnd: asset.duration,
          volume: 1,
          playbackRate: 1,
        };

        addClipToTrack(clip);

        // Mark as complete
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f
          )
        );

        toast.success(`Added ${asset.name} to timeline`);
      } catch (error: any) {
        console.error('Video processing error:', error);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
        toast.error(`Failed to process ${uploadFile.file.name}`);
      }
    }

    // Clear completed uploads after 2 seconds
    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((f) => f.status !== 'complete'));
    }, 2000);
  }, [addVideoAsset, addVideoTrack, addClipToTrack, videoTracks, extractVideoMetadata]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-gray-700 hover:border-gray-600 bg-gray-900'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`
            p-4 rounded-full transition-colors
            ${isDragging ? 'bg-purple-500/20' : 'bg-gray-800'}
          `}>
            <Upload size={32} className={isDragging ? 'text-purple-400' : 'text-gray-400'} />
          </div>

          <div>
            <p className="text-white font-medium mb-1">
              {isDragging ? 'Drop videos here' : 'Upload Videos'}
            </p>
            <p className="text-sm text-gray-400">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports MP4, MOV, AVI, WebM • Max 500MB each
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">Processing Videos</h3>
          {uploadingFiles.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="bg-gray-900 rounded-lg p-3 border border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {uploadFile.status === 'processing' && (
                    <Loader2 size={20} className="text-purple-400 animate-spin" />
                  )}
                  {uploadFile.status === 'complete' && (
                    <Check size={20} className="text-green-400" />
                  )}
                  {uploadFile.status === 'error' && (
                    <X size={20} className="text-red-400" />
                  )}
                  {uploadFile.status === 'pending' && (
                    <Video size={20} className="text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{uploadFile.file.name}</p>
                  {uploadFile.status === 'processing' && (
                    <div className="mt-1 w-full bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadFile.status === 'error' && (
                    <p className="text-xs text-red-400 mt-1">{uploadFile.error}</p>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  {(uploadFile.file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Library */}
      {videoAssets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Film size={16} />
            Video Library ({videoAssets.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {videoAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/x-video-asset-id', asset.id);
                  // Optionally, set drag image
                  if (e.target instanceof HTMLElement) {
                    const img = e.target.querySelector('img');
                    if (img) {
                      e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
                    }
                  }
                }}
              >
                {asset.thumbnail && (
                  <div className="relative aspect-video bg-black">
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                      {asset.duration.toFixed(1)}s
                    </div>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs text-white truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {asset.width} × {asset.height}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
