/**
 * Video Editing Service
 * Handles video processing, editing, and export using FFmpeg
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../lib/logger';

export interface VideoProject {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  inputFiles: string[];
  outputFile?: string;
  settings: VideoSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoSettings {
  resolution?: { width: number; height: number };
  fps?: number;
  format?: 'mp4' | 'avi' | 'mov' | 'webm';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  audioTrack?: string;
}

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  backgroundColor?: string;
  borderColor?: string;
}

export interface ImageOverlay {
  imagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  duration: number;
  opacity?: number;
}

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrimSettings {
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export class VideoEditingService {
  private uploadsDir: string;
  private outputDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
    this.outputDir = path.join(process.cwd(), 'output', 'videos');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create video directories:', error);
    }
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      ffmpeg.on('error', () => resolve(false));
      ffmpeg.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams'
      ];

      const ffprobe = spawn('ffprobe', args);
      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch (error) {
            reject(new Error('Failed to parse video metadata'));
          }
        } else {
          reject(new Error(`FFprobe failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Create video from images (slideshow)
   */
  async createVideoFromImages(
    imagePaths: string[],
    outputPath: string,
    options: {
      duration?: number; // seconds per image
      fps?: number;
      resolution?: { width: number; height: number };
      transition?: 'fade' | 'none';
      audioPath?: string;
    } = {}
  ): Promise<string> {
    const {
      duration = 3,
      fps = 30,
      resolution = { width: 1920, height: 1080 },
      transition = 'fade',
      audioPath
    } = options;

    // Create a concat file for FFmpeg
    const concatFilePath = path.join(this.uploadsDir, `concat_${Date.now()}.txt`);
    const concatContent = imagePaths.map(img => `file '${img}'\nduration ${duration}`).join('\n');
    await fs.writeFile(concatFilePath, concatContent);

    return new Promise((resolve, reject) => {
      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
        '-r', fps.toString(),
        '-pix_fmt', 'yuv420p'
      ];

      if (audioPath) {
        args.push('-i', audioPath, '-shortest');
      }

      args.push('-y', outputPath);

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', async (code) => {
        await fs.unlink(concatFilePath).catch(() => {});
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Add text overlay to video
   */
  async addTextOverlay(
    inputPath: string,
    outputPath: string,
    overlays: TextOverlay[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Build drawtext filters
      const textFilters = overlays.map(overlay => {
        const fontsize = overlay.fontSize || 24;
        const fontcolor = overlay.fontColor || 'white';
        const fontfile = overlay.fontFamily ? `:fontfile=/path/to/${overlay.fontFamily}.ttf` : '';
        const box = overlay.backgroundColor ? `:box=1:boxcolor=${overlay.backgroundColor}` : '';

        return `drawtext=text='${overlay.text}':x=${overlay.x}:y=${overlay.y}:fontsize=${fontsize}:fontcolor=${fontcolor}${fontfile}${box}:enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'`;
      });

      const filterComplex = textFilters.join(',');

      const args = [
        '-i', inputPath,
        '-vf', filterComplex,
        '-codec:a', 'copy',
        '-y', outputPath
      ];

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Add image overlay (emoji/sticker) to video
   */
  async addImageOverlay(
    inputPath: string,
    outputPath: string,
    overlays: ImageOverlay[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Build overlay filters
      const inputs = ['-i', inputPath];
      overlays.forEach(overlay => {
        inputs.push('-i', overlay.imagePath);
      });

      const overlayFilters = overlays.map((overlay, index) => {
        const opacity = overlay.opacity !== undefined ? overlay.opacity : 1;
        return `[${index + 1}:v]scale=${overlay.width}:${overlay.height},format=rgba,colorchannelmixer=aa=${opacity}[ovr${index}];[0:v][ovr${index}]overlay=${overlay.x}:${overlay.y}:enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'[v${index}]`;
      });

      const filterComplex = overlayFilters.join(';');
      const lastOutput = `[v${overlays.length - 1}]`;

      const args = [
        ...inputs,
        '-filter_complex', filterComplex,
        '-map', lastOutput,
        '-map', '0:a?',
        '-codec:a', 'copy',
        '-y', outputPath
      ];

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Crop video
   */
  async cropVideo(
    inputPath: string,
    outputPath: string,
    crop: CropSettings
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
        '-codec:a', 'copy',
        '-y', outputPath
      ];

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Trim video
   */
  async trimVideo(
    inputPath: string,
    outputPath: string,
    trim: TrimSettings
  ): Promise<string> {
    const duration = trim.endTime - trim.startTime;

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-ss', trim.startTime.toString(),
        '-t', duration.toString(),
        '-codec', 'copy',
        '-y', outputPath
      ];

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Add audio/music to video
   */
  async addAudioToVideo(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    options: {
      replaceAudio?: boolean;
      audioVolume?: number; // 0.0 to 1.0
      fadeIn?: number; // seconds
      fadeOut?: number; // seconds
    } = {}
  ): Promise<string> {
    const {
      replaceAudio = false,
      audioVolume = 1.0,
      fadeIn = 0,
      fadeOut = 0
    } = options;

    return new Promise((resolve, reject) => {
      let audioFilter = `volume=${audioVolume}`;
      if (fadeIn > 0) {
        audioFilter += `,afade=t=in:st=0:d=${fadeIn}`;
      }
      if (fadeOut > 0) {
        audioFilter += `,afade=t=out:st=${fadeOut}:d=2`;
      }

      const args = [
        '-i', videoPath,
        '-i', audioPath,
        '-filter_complex', replaceAudio
          ? `[1:a]${audioFilter}[a]`
          : `[0:a][1:a]${audioFilter}amerge=inputs=2[a]`,
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', 'copy',
        '-shortest',
        '-y', outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Merge/concatenate multiple videos
   */
  async mergeVideos(
    videoPaths: string[],
    outputPath: string
  ): Promise<string> {
    // Create a concat file
    const concatFilePath = path.join(this.uploadsDir, `concat_${Date.now()}.txt`);
    const concatContent = videoPaths.map(video => `file '${video}'`).join('\n');
    await fs.writeFile(concatFilePath, concatContent);

    return new Promise((resolve, reject) => {
      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-c', 'copy',
        '-y', outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', async (code) => {
        await fs.unlink(concatFilePath).catch(() => {});

        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Convert video format
   */
  async convertVideo(
    inputPath: string,
    outputPath: string,
    options: VideoSettings = {}
  ): Promise<string> {
    const {
      resolution,
      fps = 30,
      format = 'mp4',
      quality = 'high'
    } = options;

    // Quality presets
    const qualityPresets = {
      low: '28',
      medium: '23',
      high: '18',
      ultra: '15'
    };

    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath];

      if (resolution) {
        args.push('-vf', `scale=${resolution.width}:${resolution.height}`);
      }

      args.push(
        '-r', fps.toString(),
        '-c:v', 'libx264',
        '-crf', qualityPresets[quality],
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y', outputPath
      );

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Get video thumbnail
   */
  async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timeInSeconds: number = 1
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        '-ss', timeInSeconds.toString(),
        '-vframes', '1',
        '-y', outputPath
      ];

      logger.info(`[FFmpeg] Command: ffmpeg ${args.join(' ')}`);
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`[FFmpeg] STDERR: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[FFmpeg] Success: ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`[FFmpeg] Failed with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
    });
  }
}

export const videoEditingService = new VideoEditingService();
