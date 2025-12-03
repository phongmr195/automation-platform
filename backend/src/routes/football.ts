import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { FootballService } from '../services/footballService';
import { TelegramBot } from '../services/telegramBot';

export const footballRoutes = (opts: {
  prisma: PrismaClient;
  executionQueue: Queue;
}) => {
  const router = new Hono();
  const footballService = new FootballService();
  const telegramBot = new TelegramBot();

  /**
   * GET /football/results/yesterday
   * Get yesterday's football results
   */
  router.get('/results/yesterday', async (c) => {
    try {
      if (!footballService.isConfigured()) {
        return c.json({
          error: 'Football API not configured',
          hint: 'Set FOOTBALL_API_KEY in .env file',
        }, 400);
      }

      const results = await footballService.getYesterdayResults();
      return c.json(results);
    } catch (error: any) {
      console.error('Error fetching football results:', error);
      return c.json({
        error: 'Failed to fetch football results',
        message: error.message,
      }, 500);
    }
  });

  /**
   * POST /football/notify
   * Get yesterday's results and send to Telegram
   */
  router.post('/notify', async (c) => {
    try {
      if (!footballService.isConfigured()) {
        return c.json({
          error: 'Football API not configured',
          hint: 'Set FOOTBALL_API_KEY in .env file',
        }, 400);
      }

      if (!telegramBot.isConfigured()) {
        return c.json({
          error: 'Telegram not configured',
          hint: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file',
        }, 400);
      }

      // Fetch results
      const results = await footballService.getYesterdayResults();
      
      // Format message
      const message = footballService.formatResultsMessage(results);

      // Send to Telegram
      await telegramBot.sendMessage(message);

      return c.json({
        success: true,
        message: 'Football results sent to Telegram',
        matchesCount: results.reduce((sum, r) => sum + r.matches.length, 0),
        leaguesCount: results.length,
      });
    } catch (error: any) {
      console.error('Error notifying football results:', error);
      return c.json({
        error: 'Failed to notify football results',
        message: error.message,
      }, 500);
    }
  });

  /**
   * GET /football/leagues
   * Get list of supported leagues
   */
  router.get('/leagues', async (c) => {
    const { FOOTBALL_LEAGUES } = require('../services/footballService');
    return c.json(Object.values(FOOTBALL_LEAGUES));
  });

  return router;
};
