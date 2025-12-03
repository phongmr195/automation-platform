// Automated Scheduler for Lottery Predictions
// Run this with: node -r ts-node/register scripts/lotteryScheduler.ts

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { DRAW_SCHEDULES, type Region } from '../backend/src/services/lotteryPrediction';
import { shouldRunToday } from '../worker/src/jobs/lotteryPredictionJob';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const lotteryQueue = new Queue('executions', { connection });

async function scheduleLotteryPredictions() {
  console.log('🎰 Setting up automated lottery prediction schedules...\n');
  
  for (const [region, config] of Object.entries(DRAW_SCHEDULES) as [Region, any][]) {
    const [hour, minute] = config.time.split(':').map(Number);
    const predictionMinute = minute - config.predictionOffset;
    const predictionHour = predictionMinute < 0 ? hour - 1 : hour;
    const finalMinute = predictionMinute < 0 ? 60 + predictionMinute : predictionMinute;
    
    // Cron pattern: minute hour * * day-of-week
    let cronPattern: string;
    
    if (config.days) {
      // Specific days only
      const dayPattern = config.days.join(',');
      cronPattern = `${finalMinute} ${predictionHour} * * ${dayPattern}`;
    } else {
      // Daily
      cronPattern = `${finalMinute} ${predictionHour} * * *`;
    }
    
    const jobName = `lottery-prediction-${region.toLowerCase()}`;
    
    // Add repeatable job
    await lotteryQueue.add(
      'lottery-prediction',
      {
        region,
        date: new Date().toISOString(),
      },
      {
        repeat: {
          pattern: cronPattern,
        },
        jobId: jobName,
      }
    );
    
    console.log(`✅ ${region}:`);
    console.log(`   Draw time: ${config.time}`);
    console.log(`   Prediction time: ${String(predictionHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`);
    console.log(`   Schedule: ${cronPattern}`);
    console.log(`   Days: ${config.days ? config.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') : 'Daily'}\n`);
  }
  
  console.log('✅ All lottery prediction schedules configured!');
  console.log('📋 Jobs will run automatically based on the cron patterns above.');
  console.log('\nTo test manually, use:');
  console.log('  curl -X POST http://localhost:3000/lottery/predict/NORTH?telegram=true');
  
  process.exit(0);
}

async function clearSchedules() {
  console.log('🗑️  Clearing existing lottery schedules...');
  
  const repeatableJobs = await lotteryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id?.startsWith('lottery-prediction')) {
      await lotteryQueue.removeRepeatableByKey(job.key);
      console.log(`   Removed: ${job.id}`);
    }
  }
  
  console.log('✅ Cleared all lottery schedules');
}

// Main
(async () => {
  const command = process.argv[2];
  
  if (command === 'clear') {
    await clearSchedules();
  } else {
    await scheduleLotteryPredictions();
  }
  
  await connection.quit();
})();
