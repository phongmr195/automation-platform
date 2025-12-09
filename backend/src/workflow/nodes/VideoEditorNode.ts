/**
 * Video Editor Node
 * Allows video editing operations in workflows
 */

import type { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { videoEditingService, TextOverlay, ImageOverlay, CropSettings, TrimSettings, VideoSettings } from '../../services/videoEditingService';
import path from 'path';

export interface VideoEditorNodeConfig {
  operation: 'create_from_images' | 'add_text' | 'add_overlay' | 'crop' | 'trim' | 'add_audio' | 'merge' | 'convert';

  // Create from images
  imagePaths?: string[];
  imagesDuration?: number;
  transition?: 'fade' | 'none';

  // Text overlay
  textOverlays?: TextOverlay[];

  // Image overlay (emojis/stickers)
  imageOverlays?: ImageOverlay[];

  // Crop
  cropSettings?: CropSettings;

  // Trim
  trimSettings?: TrimSettings;

  // Audio
  audioPath?: string;
  audioVolume?: number;
  replaceAudio?: boolean;
  fadeIn?: number;
  fadeOut?: number;

  // Merge
  videoPaths?: string[];

  // Convert/Export
  videoSettings?: VideoSettings;

  // Input/Output
  inputVideoPath?: string;
  outputFileName?: string;
}

export const VideoEditorNode: INodeExecutor = {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as VideoEditorNodeConfig;
      const { operation } = config;

      // Validate operation
      if (!operation) {
        throw new Error('Operation is required');
      }

      // Check if FFmpeg is available
      const ffmpegAvailable = await videoEditingService.checkFFmpeg();
      if (!ffmpegAvailable) {
        throw new Error('FFmpeg is not installed or not available in PATH');
      }

      const outputDir = path.join(process.cwd(), 'output', 'videos');
      const timestamp = Date.now();
      const outputFileName = config.outputFileName || `output_${timestamp}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);

      let result: string;

      switch (operation) {
        case 'create_from_images':
          if (!config.imagePaths || config.imagePaths.length === 0) {
            throw new Error('No images provided for video creation');
          }
          result = await videoEditingService.createVideoFromImages(
            config.imagePaths,
            outputPath,
            {
              duration: config.imagesDuration || 3,
              transition: config.transition,
              audioPath: config.audioPath,
              resolution: config.videoSettings?.resolution
            }
          );
          break;

        case 'add_text':
          if (!config.inputVideoPath) {
            throw new Error('Input video path is required');
          }
          if (!config.textOverlays || config.textOverlays.length === 0) {
            throw new Error('No text overlays provided');
          }
          result = await videoEditingService.addTextOverlay(
            config.inputVideoPath,
            outputPath,
            config.textOverlays
          );
          break;

        case 'add_overlay':
          if (!config.inputVideoPath) {
            throw new Error('Input video path is required');
          }
          if (!config.imageOverlays || config.imageOverlays.length === 0) {
            throw new Error('No image overlays provided');
          }
          result = await videoEditingService.addImageOverlay(
            config.inputVideoPath,
            outputPath,
            config.imageOverlays
          );
          break;

        case 'crop':
          if (!config.inputVideoPath) {
            throw new Error('Input video path is required');
          }
          if (!config.cropSettings) {
            throw new Error('Crop settings are required');
          }
          result = await videoEditingService.cropVideo(
            config.inputVideoPath,
            outputPath,
            config.cropSettings
          );
          break;

        case 'trim':
          if (!config.inputVideoPath) {
            throw new Error('Input video path is required');
          }
          if (!config.trimSettings) {
            throw new Error('Trim settings are required');
          }
          result = await videoEditingService.trimVideo(
            config.inputVideoPath,
            outputPath,
            config.trimSettings
          );
          break;

        case 'add_audio':
          if (!config.inputVideoPath) {
            throw new Error('Input video path is required');
          }
          if (!config.audioPath) {
            throw new Error('Audio path is required');
          }
          result = await videoEditingService.addAudioToVideo(
            config.inputVideoPath,
            config.audioPath,
            outputPath,
            {
              replaceAudio: config.replaceAudio,
              audioVolume: config.audioVolume,
              fadeIn: config.fadeIn,
              fadeOut: config.fadeOut
            }
          );
          break;

        case 'merge':
          if (!config.videoPaths || config.videoPaths.length < 2) {
            throw new Error('At least 2 videos are required for merging');
          }
          result = await videoEditingService.mergeVideos(
            config.videoPaths,
            outputPath
          );
          break;

        case 'convert':
          if (!config.inputVideoPath) {
            throw new Error('Input video path is required');
          }
          result = await videoEditingService.convertVideo(
            config.inputVideoPath,
            outputPath,
            config.videoSettings || {}
          );
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Get video metadata
      const metadata = await videoEditingService.getVideoMetadata(result);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          outputPath: result,
          outputFileName: path.basename(result),
          operation,
          metadata: {
            duration: metadata.format?.duration,
            size: metadata.format?.size,
            bitRate: metadata.format?.bit_rate,
            videoCodec: metadata.streams?.find((s: any) => s.codec_type === 'video')?.codec_name,
            audioCodec: metadata.streams?.find((s: any) => s.codec_type === 'audio')?.codec_name,
            resolution: {
              width: metadata.streams?.find((s: any) => s.codec_type === 'video')?.width,
              height: metadata.streams?.find((s: any) => s.codec_type === 'video')?.height
            }
          },
          executionTime
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }
};
