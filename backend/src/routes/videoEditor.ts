/**
 * Video Editor API Routes
 * Handles video upload, editing, and export
 */

import { Hono } from 'hono';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { authMiddleware } from '../middleware/auth';
import { videoEditingService, TextOverlay, ImageOverlay } from '../services/videoEditingService';
import { prisma } from '../lib/prisma';

const app = new Hono();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = /mp4|avi|mov|wmv|flv|webm/;
    const allowedImageTypes = /jpeg|jpg|png|gif/;
    const allowedAudioTypes = /mp3|wav|aac|ogg/;

    const ext = path.extname(file.originalname).toLowerCase().slice(1);

    if (file.fieldname === 'video' && allowedVideoTypes.test(ext)) {
      cb(null, true);
    } else if (file.fieldname === 'images' && allowedImageTypes.test(ext)) {
      cb(null, true);
    } else if (file.fieldname === 'audio' && allowedAudioTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Apply auth middleware
app.use('*', authMiddleware);

/**
 * POST /video-editor/upload
 * Upload video, images, or audio files
 */
app.post('/upload', async (c) => {
  try {
    // Note: In a real implementation, you'd use multer with Hono
    // For now, this is a placeholder showing the structure

    return c.json({
      success: true,
      message: 'File upload endpoint - implement with multer middleware',
      note: 'Use multipart/form-data with fields: video, images[], audio'
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/projects
 * Create a new video editing project
 */
app.post('/projects', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const body = await c.req.json();
    const { name, organizationId } = body;

    const project = await prisma.videoProject.create({
      data: {
        name,
        userId,
        organizationId,
        status: 'draft',
        settings: {}
      }
    });

    return c.json({ project }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /video-editor/projects
 * List user's video projects
 */
app.get('/projects', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const { organizationId } = c.req.query();

    const projects = await prisma.videoProject.findMany({
      where: {
        userId,
        ...(organizationId && { organizationId })
      },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ projects });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /video-editor/projects/:id
 * Get project details
 */
app.get('/projects/:id', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const { id } = c.req.param();

    const project = await prisma.videoProject.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json({ project });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/create-from-images
 * Create video from images
 */
app.post('/create-from-images', async (c) => {
  try {
    const body = await c.req.json();
    const { imagePaths, duration, audioPath, resolution, projectId } = body;

    if (!imagePaths || imagePaths.length === 0) {
      return c.json({ error: 'No images provided' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_${Date.now()}.mp4`
    );

    const result = await videoEditingService.createVideoFromImages(
      imagePaths,
      outputPath,
      {
        duration: duration || 3,
        audioPath,
        resolution
      }
    );

    // Update project if provided
    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    const metadata = await videoEditingService.getVideoMetadata(result);

    return c.json({
      success: true,
      outputPath: result,
      metadata
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/add-text
 * Add text overlays to video
 */
app.post('/add-text', async (c) => {
  try {
    const body = await c.req.json();
    const { inputPath, textOverlays, projectId } = body;

    if (!inputPath) {
      return c.json({ error: 'Input video path is required' }, 400);
    }

    if (!textOverlays || textOverlays.length === 0) {
      return c.json({ error: 'No text overlays provided' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_text_${Date.now()}.mp4`
    );

    const result = await videoEditingService.addTextOverlay(
      inputPath,
      outputPath,
      textOverlays as TextOverlay[]
    );

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    return c.json({
      success: true,
      outputPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/add-overlay
 * Add image overlays (emojis/stickers) to video
 */
app.post('/add-overlay', async (c) => {
  try {
    const body = await c.req.json();
    const { inputPath, imageOverlays, projectId } = body;

    if (!inputPath) {
      return c.json({ error: 'Input video path is required' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_overlay_${Date.now()}.mp4`
    );

    const result = await videoEditingService.addImageOverlay(
      inputPath,
      outputPath,
      imageOverlays as ImageOverlay[]
    );

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    return c.json({
      success: true,
      outputPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/crop
 * Crop video
 */
app.post('/crop', async (c) => {
  try {
    const body = await c.req.json();
    const { inputPath, x, y, width, height, projectId } = body;

    if (!inputPath) {
      return c.json({ error: 'Input video path is required' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_crop_${Date.now()}.mp4`
    );

    const result = await videoEditingService.cropVideo(
      inputPath,
      outputPath,
      { x, y, width, height }
    );

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    return c.json({
      success: true,
      outputPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/trim
 * Trim video
 */
app.post('/trim', async (c) => {
  try {
    const body = await c.req.json();
    const { inputPath, startTime, endTime, projectId } = body;

    if (!inputPath) {
      return c.json({ error: 'Input video path is required' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_trim_${Date.now()}.mp4`
    );

    const result = await videoEditingService.trimVideo(
      inputPath,
      outputPath,
      { startTime, endTime }
    );

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    return c.json({
      success: true,
      outputPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/add-audio
 * Add audio/music to video
 */
app.post('/add-audio', async (c) => {
  try {
    const body = await c.req.json();
    const { videoPath, audioPath, replaceAudio, audioVolume, fadeIn, fadeOut, projectId } = body;

    if (!videoPath || !audioPath) {
      return c.json({ error: 'Video and audio paths are required' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_audio_${Date.now()}.mp4`
    );

    const result = await videoEditingService.addAudioToVideo(
      videoPath,
      audioPath,
      outputPath,
      {
        replaceAudio: replaceAudio !== undefined ? replaceAudio : false,
        audioVolume: audioVolume || 1.0,
        fadeIn,
        fadeOut
      }
    );

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    return c.json({
      success: true,
      outputPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/merge
 * Merge multiple videos
 */
app.post('/merge', async (c) => {
  try {
    const body = await c.req.json();
    const { videoPaths, projectId } = body;

    if (!videoPaths || videoPaths.length < 2) {
      return c.json({ error: 'At least 2 videos are required' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_merge_${Date.now()}.mp4`
    );

    const result = await videoEditingService.mergeVideos(videoPaths, outputPath);

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    return c.json({
      success: true,
      outputPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/convert
 * Convert/export video
 */
app.post('/convert', async (c) => {
  try {
    const body = await c.req.json();
    const { inputPath, resolution, fps, format, quality, projectId } = body;

    if (!inputPath) {
      return c.json({ error: 'Input video path is required' }, 400);
    }

    const outputPath = path.join(
      process.cwd(),
      'output',
      'videos',
      `video_convert_${Date.now()}.${format || 'mp4'}`
    );

    const result = await videoEditingService.convertVideo(
      inputPath,
      outputPath,
      { resolution, fps, format, quality }
    );

    if (projectId) {
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          outputFile: result,
          status: 'completed',
          updatedAt: new Date()
        }
      });
    }

    const metadata = await videoEditingService.getVideoMetadata(result);

    return c.json({
      success: true,
      outputPath: result,
      metadata
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /video-editor/download/:filename
 * Download processed video
 */
app.get('/download/:filename', async (c) => {
  try {
    const { filename } = c.req.param();
    const filePath = path.join(process.cwd(), 'output', 'videos', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Set headers
    c.header('Content-Type', 'video/mp4');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);

    return c.body(fileBuffer);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /video-editor/metadata/:filename
 * Get video metadata
 */
app.get('/metadata/:filename', async (c) => {
  try {
    const { filename } = c.req.param();
    const filePath = path.join(process.cwd(), 'output', 'videos', filename);

    const metadata = await videoEditingService.getVideoMetadata(filePath);

    return c.json({ metadata });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /video-editor/thumbnail
 * Generate video thumbnail
 */
app.post('/thumbnail', async (c) => {
  try {
    const body = await c.req.json();
    const { videoPath, timeInSeconds } = body;

    if (!videoPath) {
      return c.json({ error: 'Video path is required' }, 400);
    }

    const thumbnailPath = path.join(
      process.cwd(),
      'output',
      'thumbnails',
      `thumb_${Date.now()}.jpg`
    );

    await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });

    const result = await videoEditingService.generateThumbnail(
      videoPath,
      thumbnailPath,
      timeInSeconds || 1
    );

    return c.json({
      success: true,
      thumbnailPath: result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /video-editor/check-ffmpeg
 * Check if FFmpeg is installed
 */
app.get('/check-ffmpeg', async (c) => {
  try {
    const available = await videoEditingService.checkFFmpeg();

    return c.json({
      available,
      message: available
        ? 'FFmpeg is installed and ready'
        : 'FFmpeg is not installed. Please install FFmpeg to use video editing features.'
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
