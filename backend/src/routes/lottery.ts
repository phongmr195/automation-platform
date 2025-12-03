import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { LotteryPredictor, DRAW_SCHEDULES, type Region } from '../services/lotteryPrediction';
import { TelegramBot } from '../services/telegramBot';
import { AIProvider } from '../services/aiPredictionService';

export const lotteryRoutes = (opts: { prisma: PrismaClient; executionQueue: Queue }) => {
  const router = new Hono();
  const { prisma, executionQueue } = opts;
  
  const predictor = new LotteryPredictor();
  const telegram = new TelegramBot();
  
  // Manual prediction endpoint (legacy frequency-based)
  router.post('/predict/:region', async (c) => {
    const region = c.req.param('region').toUpperCase() as Region;
    
    if (!['NORTH', 'CENTRAL', 'SOUTH'].includes(region)) {
      return c.json({ error: 'Invalid region. Use NORTH, CENTRAL, or SOUTH' }, 400);
    }
    
    const date = new Date();
    const prediction = await predictor.predictForRegion(region, date);
    
    // Optionally send to Telegram
    const sendToTelegram = c.req.query('telegram') === 'true';
    if (sendToTelegram) {
      try {
        await telegram.sendPrediction(prediction);
      } catch (err) {
        console.error('Failed to send to Telegram:', err);
      }
    }
    
    return c.json(prediction);
  });

  // AI-powered prediction with specific provider
  router.post('/ai/predict/:region', async (c) => {
    const region = c.req.param('region').toUpperCase() as Region;
    const provider = (c.req.query('provider') || 'groq') as AIProvider;
    
    if (!['NORTH', 'CENTRAL', 'SOUTH'].includes(region)) {
      return c.json({ error: 'Invalid region. Use NORTH, CENTRAL, or SOUTH' }, 400);
    }

    if (!['claude', 'gpt', 'gemini', 'groq'].includes(provider)) {
      return c.json({ error: 'Invalid provider. Use claude, gpt, gemini, or groq' }, 400);
    }
    
    try {
      const date = new Date();
      const prediction = await predictor.predictWithAI(region, date, provider);
      
      // Optionally send to Telegram
      const sendToTelegram = c.req.query('telegram') === 'true';
      if (sendToTelegram) {
        try {
          await telegram.sendPrediction(prediction);
        } catch (err) {
          console.error('Failed to send to Telegram:', err);
        }
      }
      
      return c.json(prediction);
    } catch (error: any) {
      return c.json({ 
        error: 'AI prediction failed', 
        message: error.message,
        hint: 'Make sure you have configured the API key in .env file'
      }, 500);
    }
  });

  // Consensus prediction from all available AI models
  router.post('/ai/consensus/:region', async (c) => {
    const region = c.req.param('region').toUpperCase() as Region;
    
    if (!['NORTH', 'CENTRAL', 'SOUTH'].includes(region)) {
      return c.json({ error: 'Invalid region. Use NORTH, CENTRAL, or SOUTH' }, 400);
    }
    
    try {
      const date = new Date();
      const result = await predictor.predictWithConsensus(region, date);
      
      // Optionally send to Telegram
      const sendToTelegram = c.req.query('telegram') === 'true';
      if (sendToTelegram) {
        try {
          await telegram.sendPrediction(result.prediction);
        } catch (err) {
          console.error('Failed to send to Telegram:', err);
        }
      }
      
      return c.json({
        consensus: result.prediction,
        individual: result.individualPredictions.map(p => ({
          provider: p.provider,
          confidence: p.confidence,
          reasoning: p.reasoning,
          bachThuLo: p.bachThuLo,
        })),
        summary: {
          totalModels: result.individualPredictions.length,
          avgConfidence: Math.round(
            result.individualPredictions.reduce((sum, p) => sum + p.confidence, 0) / 
            result.individualPredictions.length
          ),
        }
      });
    } catch (error: any) {
      return c.json({ 
        error: 'AI consensus prediction failed', 
        message: error.message,
        hint: 'Make sure you have configured at least one AI API key in .env file'
      }, 500);
    }
  });

  // Compare predictions from all methods
  router.post('/compare/:region', async (c) => {
    const region = c.req.param('region').toUpperCase() as Region;
    
    if (!['NORTH', 'CENTRAL', 'SOUTH'].includes(region)) {
      return c.json({ error: 'Invalid region. Use NORTH, CENTRAL, or SOUTH' }, 400);
    }
    
    const date = new Date();
    const results: any = {
      region,
      date,
      predictions: {},
    };

    // Frequency-based prediction
    try {
      results.predictions.frequency = await predictor.predictForRegion(region, date);
    } catch (error: any) {
      results.predictions.frequency = { error: error.message };
    }

    // AI predictions
    const providers: AIProvider[] = ['claude', 'gpt', 'gemini', 'groq'];
    for (const provider of providers) {
      try {
        results.predictions[provider] = await predictor.predictWithAI(region, date, provider);
      } catch (error: any) {
        results.predictions[provider] = { error: error.message, configured: false };
      }
    }

    // Consensus
    try {
      const consensus = await predictor.predictWithConsensus(region, date);
      results.predictions.consensus = consensus.prediction;
    } catch (error: any) {
      results.predictions.consensus = { error: error.message };
    }

    return c.json(results);
  });
  
  // Schedule automatic predictions
  router.post('/schedule/enable', async (c) => {
    // Create scheduled jobs for each region
    const jobs = [];
    
    for (const [region, config] of Object.entries(DRAW_SCHEDULES)) {
      // Calculate when to run (45 min before draw time)
      const [hour, minute] = config.time.split(':').map(Number);
      const predictionMinute = minute - config.predictionOffset;
      const predictionHour = predictionMinute < 0 ? hour - 1 : hour;
      const finalMinute = predictionMinute < 0 ? 60 + predictionMinute : predictionMinute;
      
      // Create a cron pattern
      const cronPattern = `${finalMinute} ${predictionHour} * * *`;
      
      jobs.push({
        region,
        schedule: cronPattern,
        config,
      });
    }
    
    return c.json({
      message: 'Lottery prediction scheduler configured',
      jobs,
      note: 'Add these to your cron or use BullMQ repeat jobs',
    });
  });
  
  // Test Telegram connection
  router.post('/telegram/test', async (c) => {
    try {
      await telegram.sendTestMessage();
      return c.json({ success: true, message: 'Test message sent to Telegram' });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });
  
  // Get schedules
  router.get('/schedules', (c) => {
    return c.json(DRAW_SCHEDULES);
  });
  
  return router;
};
