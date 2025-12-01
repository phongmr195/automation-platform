import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import * as Prisma from '@prisma/client';
import workflowsRouter from './routes/workflows';

dotenv.config();

const app = new Hono();
const prisma = new Prisma.PrismaClient();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});
const executionQueue = new Queue('executions', { connection });

app.get('/', c => c.body('Automation Platform API'));

app.route('/workflows', workflowsRouter({ prisma, executionQueue }));

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port });
console.log('Backend running on', port);
