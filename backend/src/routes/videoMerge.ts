/**
 * Video Merge API Route
 * Handles merging multiple video clips into a single video using FFmpeg
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const app = new Hono();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
const OUTPUT_DIR = path.join(UPLOADS_DIR, 'merged');

// Ensure directories exist
const ensureDirectories = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
};

// Video clip schema
const VideoClipSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetUrl: z.string(), // Full URL or path to video file
  startTime: z.number(),
  duration: z.number(),
  trimStart: z.number(),
  trimEnd: z.number(),
  volume: z.number().default(1),
  playbackRate: z.number().default(1),
});

// Merge request schema
const MergeRequestSchema = z.object({
  clips: z.array(VideoClipSchema).min(1),
  outputResolution: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
  }).optional(),
  outputFormat: z.enum(['mp4', 'webm', 'mov']).default('mp4'),
  quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
});

type VideoClip = z.infer<typeof VideoClipSchema>;
type MergeRequest = z.infer<typeof MergeRequestSchema>;

/**
 * Build FFmpeg command for merging video clips
 */
function buildMergeCommand(
  clips: VideoClip[],
  outputPath: string,
  options: {
    resolution?: { width: number; height: number };
    quality?: string;
  }
): string {
  const { resolution = { width: 1920, height: 1080 }, quality = 'high' } = options;

  // Quality presets
  const qualityMap = {
    low: { crf: 28, preset: 'veryfast' },
    medium: { crf: 23, preset: 'medium' },
    high: { crf: 20, preset: 'slow' },
    ultra: { crf: 17, preset: 'slow' },
  };

  const { crf, preset } = qualityMap[quality as keyof typeof qualityMap] || qualityMap.medium;

  // Build filter_complex for trimming and concatenation
  const filterParts: string[] = [];
  const inputFiles: string[] = [];

  clips.forEach((clip, index) => {
    inputFiles.push(`-i "${clip.assetUrl}"`);

    // Trim video and audio
    const trimDuration = clip.duration;
    const trimStart = clip.trimStart;

    // Video trim and scale
    filterParts.push(
      `[${index}:v]trim=start=${trimStart}:duration=${trimDuration},setpts=PTS-STARTPTS,` +
      `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,` +
      `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2:black,` +
      `setsar=1,fps=30[v${index}]`
    );

    // Audio trim and volume
    filterParts.push(
      `[${index}:a]atrim=start=${trimStart}:duration=${trimDuration},` +
      `asetpts=PTS-STARTPTS,volume=${clip.volume}[a${index}]`
    );
  });

  // Concatenate all clips
  const videoStreams = clips.map((_, i) => `[v${i}]`).join('');
  const audioStreams = clips.map((_, i) => `[a${i}]`).join('');

  filterParts.push(
    `${videoStreams}concat=n=${clips.length}:v=1:a=0[vout]`
  );
  filterParts.push(
    `${audioStreams}concat=n=${clips.length}:v=0:a=1[aout]`
  );

  const filterComplex = filterParts.join(';');

  // Build complete command
  const command = [
    'ffmpeg',
    '-hide_banner',
    ...inputFiles,
    `-filter_complex "${filterComplex}"`,
    '-map "[vout]"',
    '-map "[aout]"',
    `-c:v libx264`,
    `-preset ${preset}`,
    `-crf ${crf}`,
    `-c:a aac`,
    '-b:a 192k',
    '-movflags +faststart',
    '-y',
    `"${outputPath}"`,
  ].join(' ');

  return command;
}

/**
 * POST /merge
 * Merge multiple video clips into a single video
 */
app.post('/merge', async (c) => {
  try {
    await ensureDirectories();

    const body = await c.req.json();
    console.log('📥 Merge request:', {
      clips: body.clips?.length || 0,
      resolution: body.outputResolution,
      format: body.outputFormat,
    });

    const validatedData = MergeRequestSchema.parse(body);
    const { clips, outputResolution, outputFormat, quality } = validatedData;

    // Sort clips by startTime
    const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);

    // Generate output filename
    const timestamp = Date.now();
    const outputFilename = `merged-${timestamp}.${outputFormat}`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    console.log('🎬 Building FFmpeg command...');
    const command = buildMergeCommand(sortedClips, outputPath, {
      resolution: outputResolution,
      quality,
    });

    console.log('▶️ Executing FFmpeg...');
    console.log('Command:', command);

    // Execute FFmpeg
    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Merge completed in ${executionTime}s`);

      // Get file stats
      const stats = await fs.stat(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      return c.json({
        success: true,
        message: 'Videos merged successfully',
        output: {
          filename: outputFilename,
          url: `/uploads/merged/${outputFilename}`,
          size: stats.size,
          sizeMB: fileSizeMB,
          duration: sortedClips.reduce((sum, clip) => sum + clip.duration, 0),
          resolution: outputResolution,
        },
        executionTime: `${executionTime}s`,
      });
    } catch (error: any) {
      console.error('❌ FFmpeg error:', error.message);
      
      return c.json(
        {
          success: false,
          error: 'Video merge failed',
          message: error.message,
          stderr: error.stderr,
        },
        500
      );
    }
  } catch (error: any) {
    console.error('❌ Merge error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }

    return c.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
});

/**
 * POST /merge/concat-simple
 * Simple concatenation without complex filtering (faster but less control)
 */
app.post('/merge/concat-simple', async (c) => {
  try {
    await ensureDirectories();

    const body = await c.req.json();
    const { clips, outputFormat = 'mp4' } = body;

    if (!clips || clips.length === 0) {
      return c.json({ success: false, error: 'No clips provided' }, 400);
    }

    // Create concat file
    const concatFilePath = path.join(TEMP_DIR, `concat-${Date.now()}.txt`);
    const concatContent = clips
      .map((clip: VideoClip) => `file '${clip.assetUrl}'`)
      .join('\n');

    await fs.writeFile(concatFilePath, concatContent);

    // Output path
    const timestamp = Date.now();
    const outputFilename = `merged-simple-${timestamp}.${outputFormat}`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    // Simple concat command
    const command = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;

    console.log('▶️ Executing simple concat...');
    const { stdout, stderr } = await execAsync(command);

    // Cleanup concat file
    await fs.unlink(concatFilePath);

    const stats = await fs.stat(outputPath);

    return c.json({
      success: true,
      message: 'Videos concatenated successfully',
      output: {
        filename: outputFilename,
        url: `/uploads/merged/${outputFilename}`,
        size: stats.size,
      },
    });
  } catch (error: any) {
    console.error('❌ Concat error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /merge/progress/:jobId
 * Get merge progress (placeholder for future implementation with job queue)
 */
app.get('/merge/progress/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  
  // TODO: Implement with job queue (Bull, BullMQ, etc.)
  return c.json({
    jobId,
    status: 'pending',
    progress: 0,
    message: 'Progress tracking not yet implemented',
  });
});

export default app;
