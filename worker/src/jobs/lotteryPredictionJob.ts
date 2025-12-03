// BullMQ Job for automated lottery predictions
import { PrismaClient } from '@prisma/client';
import { LotteryPredictor, type Region, DRAW_SCHEDULES } from '../../../backend/src/services/lotteryPrediction';
import { TelegramBot } from '../../../backend/src/services/telegramBot';

const prisma = new PrismaClient();
const predictor = new LotteryPredictor();
const telegram = new TelegramBot();

export interface LotteryJobData {
  region: Region;
  date: string;
}

export async function runLotteryPrediction(data: LotteryJobData): Promise<void> {
  const { region, date } = data;
  const predictionDate = new Date(date);
  
  console.log(`🎰 Running lottery prediction for ${region} on ${predictionDate.toDateString()}`);
  
  try {
    // Generate prediction
    const prediction = await predictor.predictForRegion(region, predictionDate);
    
    console.log(`✅ Generated prediction:`, {
      region: prediction.region,
      bachThuLo: prediction.bachThuLo,
      confidence: prediction.confidence,
    });
    
    // Send to Telegram
    await telegram.sendPrediction(prediction);
    
    console.log(`✅ Prediction sent to Telegram for ${region}`);
    
    // TODO: Store prediction in database for later verification
    // await prisma.lotteryPrediction.create({ data: { ... } });
    
  } catch (error: any) {
    console.error(`❌ Lottery prediction failed for ${region}:`, error.message);
    throw error;
  }
}

// Helper to check if prediction should run today
export function shouldRunToday(region: Region): boolean {
  const config = DRAW_SCHEDULES[region];
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  if (!config.days) {
    // NORTH runs daily
    return true;
  }
  
  return config.days.includes(today);
}
