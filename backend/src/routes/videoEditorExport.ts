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

const ensureDirectories = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('❌ Directory error:', error);
    throw error;
  }
};

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const ExportSchema = z.object({
  videoSrc: z.string().optional().nullable(),
  elements: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'image', 'shape', 'video', 'audio']),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    startTime: z.number(),
    duration: z.number(),
    rotation: z.number().optional(),
    opacity: z.number().optional(),
    zIndex: z.number().optional(),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    fontStyle: z.string().optional(),
    color: z.string().optional(),
    src: z.string().optional(),
    shapeType: z.string().optional(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
  })),
  canvasWidth: z.number(),
  canvasHeight: z.number(),
  duration: z.number(),
  backgroundColor: z.string().optional(),
});

app.post('/export', async (c) => {
  let tempFiles: string[] = [];
  
  try {
    await ensureDirectories();
    
    const body = await c.req.json();
    console.log('📥 Export request:', {
      elements: body.elements?.length || 0,
      hasVideo: !!body.videoSrc,
      duration: body.duration
    });
    
    const validatedData = ExportSchema.parse(body);
    const { videoSrc, elements, canvasWidth, canvasHeight, duration, backgroundColor } = validatedData;
    
    const timestamp = Date.now();
    const outputFilename = `video-${timestamp}.mp4`;
    const outputPath = path.join(UPLOADS_DIR, outputFilename);
    
    console.log('🎬 Export config:', {
      canvas: `${canvasWidth}x${canvasHeight}`,
      duration: `${duration}s`,
      elements: elements.length,
      hasVideo: !!videoSrc
    });
    
    // Build command
    const inputs: string[] = [];
    const filters: string[] = [];
    let currentLayer = '[0:v]';
    
    // Base input
    if (videoSrc && !videoSrc.startsWith('blob:')) {
      inputs.push(`-i "${videoSrc}"`);
    } else {
      const bgColor = backgroundColor || 'white';
      inputs.push(`-f lavfi -i color=c=${bgColor}:s=${canvasWidth}x${canvasHeight}:d=${duration}:r=30`);
    }
    
    // Sort elements
    const sorted = [...elements].sort((a, b) => {
      const aZ = a.zIndex || 0;
      const bZ = b.zIndex || 0;
      if (aZ !== bZ) return aZ - bZ;
      return a.startTime - b.startTime;
    });
    
    let overlayCount = 0;
    let inputIndex = 1;
    
    // Save images to temp
    const imageElements = sorted.filter(el => el.type === 'image' && el.src);
    
    for (const el of imageElements) {
      if (!el.src || !el.src.startsWith('data:image')) continue;
      
      try {
        const base64Data = el.src.split(',')[1];
        if (!base64Data) {
          console.warn(`⚠️ No base64 data: ${el.id}`);
          continue;
        }
        
        const buffer = Buffer.from(base64Data, 'base64');
        const safeId = sanitizeFilename(el.id);
        const imgPath = path.join(TEMP_DIR, `img_${timestamp}_${safeId}.png`);
        
        await fs.writeFile(imgPath, buffer);
        tempFiles.push(imgPath);
        
        console.log(`   ✅ Image saved: ${path.basename(imgPath)}`);
        
        inputs.push(`-loop 1 -t ${duration} -i "${imgPath}"`);
        inputIndex++;
      } catch (err) {
        console.error(`   ❌ Image save failed: ${el.id}`, err);
      }
    }
    
    // Build filters
    let imageInputIdx = 1;
    
    for (const el of sorted) {
      const start = el.startTime;
      const end = el.startTime + el.duration;
      
      if (el.type === 'text' && el.text) {
        const text = el.text
          .replace(/\\/g, '\\\\\\\\')
          .replace(/'/g, "\\'")
          .replace(/:/g, "\\:")
          .replace(/\n/g, ' ')
          .substring(0, 100);
        
        const size = Math.max(12, Math.min(200, el.fontSize || 32));
        const color = (el.color || '#ffffff').replace('#', '0x');
        
        let filter = `drawtext=text='${text}'`;
        filter += `:x=${Math.round(el.x)}`;
        filter += `:y=${Math.round(el.y)}`;
        filter += `:fontsize=${size}`;
        filter += `:fontcolor=${color}`;
        
        if (start > 0 || end < duration) {
          filter += `:enable='between(t,${start},${end})'`;
        }
        
        filters.push(`${currentLayer}${filter}[v${overlayCount}]`);
        currentLayer = `[v${overlayCount}]`;
        overlayCount++;
        
        console.log(`   📝 Text: "${text.substring(0, 20)}..." at ${start}s-${end}s`);
      }
      
      if (el.type === 'image' && el.src?.startsWith('data:image')) {
        const w = Math.max(1, Math.round(el.width));
        const h = Math.max(1, Math.round(el.height));
        const x = Math.round(el.x);
        const y = Math.round(el.y);
        
        filters.push(`[${imageInputIdx}:v]scale=${w}:${h}[img${overlayCount}]`);
        
        let overlay = `${currentLayer}[img${overlayCount}]overlay=${x}:${y}`;
        if (start > 0 || end < duration) {
          overlay += `:enable='between(t,${start},${end})'`;
        }
        overlay += `[v${overlayCount}]`;
        filters.push(overlay);
        
        currentLayer = `[v${overlayCount}]`;
        overlayCount++;
        imageInputIdx++;
        
        console.log(`   🖼️ Image at ${start}s-${end}s`);
      }
      
      if (el.type === 'shape' && el.shapeType === 'rectangle') {
        const color = (el.fill || '#ffffff').replace('#', '0x');
        const w = Math.max(1, Math.round(el.width));
        const h = Math.max(1, Math.round(el.height));
        const x = Math.round(el.x);
        const y = Math.round(el.y);
        
        let filter = `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill`;
        if (start > 0 || end < duration) {
          filter += `:enable='between(t,${start},${end})'`;
        }
        
        filters.push(`${currentLayer}${filter}[v${overlayCount}]`);
        currentLayer = `[v${overlayCount}]`;
        overlayCount++;
        
        console.log(`   🔲 Shape at ${start}s-${end}s`);
      }
    }
    
    // Build final command
    let cmd = `ffmpeg -y ${inputs.join(' ')}`;
    
    if (filters.length > 0) {
      cmd += ` -filter_complex "${filters.join(';')}"`;
      // FIX: Don't slice! Use currentLayer directly with brackets
      cmd += ` -map ${currentLayer}`;  // ✅ [v2] not "v2"
    }
    
    cmd += ` -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p`;
    cmd += ` -t ${duration}`;
    cmd += ` "${outputPath}"`;
    
    console.log(`🎬 Command length: ${cmd.length} chars`);
    console.log(`   Preview: ${cmd.substring(0, 120)}...`);
    
    // Execute
    console.log('⏳ Processing...');
    const execStart = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 5 * 60 * 1000,
      });
      
      const time = ((Date.now() - execStart) / 1000).toFixed(1);
      const stats = await fs.stat(outputPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`✅ Success! ${time}s, ${sizeMB} MB`);
      
      // Cleanup
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
        } catch {}
      }
      
      return c.json({
        success: true,
        filename: outputFilename,
        url: `/uploads/${outputFilename}`,
        message: 'Video exported successfully!',
        duration,
        resolution: `${canvasWidth}x${canvasHeight}`,
        fileSize: `${sizeMB} MB`,
        processingTime: `${time}s`,
      });
      
    } catch (execError: any) {
      console.error('❌ FFmpeg error:', execError.message);
      if (execError.stderr) {
        const lines = execError.stderr.split('\n');
        const errorLines = lines.filter((l: string) => l.includes('Error') || l.includes('Failed'));
        errorLines.forEach((line: string) => console.error('   ', line));
      }
      throw execError;
    }
    
  } catch (error: any) {
    console.error('❌ Export failed:', error.message || error);
    
    for (const file of tempFiles) {
      try { await fs.unlink(file); } catch {}
    }
    
    return c.json({ 
      error: 'Export failed', 
      message: error.message || error.toString(),
      details: error.stderr || error.stdout || 'No details',
      hint: 'Check backend logs for details',
    }, 500);
  }
});

app.get('/check-ffmpeg', async (c) => {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const version = stdout.split('\n')[0];
    
    return c.json({
      available: true,
      version,
      message: 'FFmpeg ready!',
      uploadsDir: UPLOADS_DIR,
      tempDir: TEMP_DIR,
    });
  } catch (error: any) {
    return c.json({
      available: false,
      message: 'FFmpeg not found. Install: brew install ffmpeg',
      error: error.message,
    }, 500);
  }
});

export default app;
