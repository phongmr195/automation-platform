// Lottery Prediction Service for Vietnam 3 regions
import { PrismaClient } from '@prisma/client';
import { AIPredictionService, AIPrediction, AIProvider } from './aiPredictionService';

const prisma = new PrismaClient();

export type Region = 'NORTH' | 'CENTRAL' | 'SOUTH';

export interface LotteryPrediction {
  region: Region;
  date: Date;
  bachThuLo: string[]; // Bạch thủ lô - 1 number
  lo3So: string[]; // Lô 3 số - 2 numbers
  loXien2: string[][]; // Xiên 2 - 6 pairs
  xien3: string[][]; // Xiên 3 - 3 triplets
  xien4: string[][]; // Xiên 4 - 1 quadruplet
  confidence: number; // 0-100
  aiProvider?: AIProvider; // Which AI model was used
  reasoning?: string; // AI reasoning for the prediction
}

// Simple frequency-based prediction using historical data
export class LotteryPredictor {
  private aiService: AIPredictionService;

  constructor() {
    this.aiService = new AIPredictionService();
  }
  
  // Predict using AI models
  async predictWithAI(
    region: Region, 
    date: Date, 
    provider: AIProvider = 'claude'
  ): Promise<LotteryPrediction> {
    const historicalData = await this.getHistoricalResults(region, 30);
    
    let aiPrediction: AIPrediction;
    
    switch (provider) {
      case 'claude':
        aiPrediction = await this.aiService.predictWithClaude(region, historicalData);
        break;
      case 'gpt':
        aiPrediction = await this.aiService.predictWithGPT(region, historicalData);
        break;
      case 'gemini':
        aiPrediction = await this.aiService.predictWithGemini(region, historicalData);
        break;
      case 'groq':
        aiPrediction = await this.aiService.predictWithGroq(region, historicalData);
        break;
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
    
    return {
      region,
      date,
      bachThuLo: aiPrediction.bachThuLo,
      lo3So: aiPrediction.lo3So,
      loXien2: aiPrediction.loXien2,
      xien3: aiPrediction.xien3,
      xien4: aiPrediction.xien4,
      confidence: aiPrediction.confidence,
      aiProvider: provider,
      reasoning: aiPrediction.reasoning,
    };
  }

  // Get consensus prediction from all available AI models
  async predictWithConsensus(region: Region, date: Date): Promise<{
    prediction: LotteryPrediction;
    individualPredictions: AIPrediction[];
  }> {
    const historicalData = await this.getHistoricalResults(region, 30);
    const { predictions, consensus } = await this.aiService.predictWithAll(region, historicalData);
    
    return {
      prediction: {
        region,
        date,
        bachThuLo: consensus.bachThuLo,
        lo3So: consensus.lo3So,
        loXien2: consensus.loXien2,
        xien3: consensus.xien3,
        xien4: consensus.xien4,
        confidence: consensus.confidence,
        aiProvider: 'claude', // Consensus uses all models
        reasoning: consensus.reasoning,
      },
      individualPredictions: predictions,
    };
  }
  
  // Analyze historical results and generate predictions (legacy frequency-based method)
  async predictForRegion(region: Region, date: Date): Promise<LotteryPrediction> {
    // Get last 30 days of results for this region
    const historicalData = await this.getHistoricalResults(region, 30);
    
    // Calculate frequencies
    const frequencies = this.calculateFrequencies(historicalData);
    
    // Generate predictions based on patterns
    const bachThuLo = this.predictBachThuLo(frequencies, 1);
    const lo3So = this.predictLo3So(frequencies, 2);
    const loXien2 = this.predictXien(bachThuLo, 2, 6);
    const xien3 = this.predictXien(bachThuLo, 3, 3);
    const xien4 = this.predictXien(bachThuLo, 4, 1);
    
    return {
      region,
      date,
      bachThuLo,
      lo3So,
      loXien2,
      xien3,
      xien4,
      confidence: this.calculateConfidence(frequencies),
    };
  }
  
  private async getHistoricalResults(region: Region, days: number): Promise<any[]> {
    // TODO: Fetch from database or external API
    // For now, return mock data structure
    return [];
  }
  
  private calculateFrequencies(data: any[]): Map<string, number> {
    const freq = new Map<string, number>();
    
    // Analyze all numbers from historical results
    data.forEach(result => {
      if (result.numbers) {
        result.numbers.forEach((num: string) => {
          const last2Digits = num.slice(-2);
          freq.set(last2Digits, (freq.get(last2Digits) || 0) + 1);
        });
      }
    });
    
    return freq;
  }
  
  private predictBachThuLo(frequencies: Map<string, number>, count: number): string[] {
    // Sort by frequency and get top numbers
    const sorted = Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count * 2);
    
    // Mix hot numbers with some random picks for diversity
    const predictions: string[] = [];
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.3 && sorted[i]) {
        predictions.push(sorted[i][0]);
      } else {
        predictions.push(String(Math.floor(Math.random() * 100)).padStart(2, '0'));
      }
    }
    
    return [...new Set(predictions)].slice(0, count);
  }
  
  private predictLo3So(frequencies: Map<string, number>, count: number): string[] {
    const predictions: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 3-digit combinations
      const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      predictions.push(num);
    }
    
    return [...new Set(predictions)].slice(0, count);
  }
  
  private predictXien(numbers: string[], size: number, count: number): string[][] {
    const combinations: string[][] = [];
    
    // Generate combinations of specified size
    const generate = (start: number, combo: string[]) => {
      if (combo.length === size) {
        combinations.push([...combo]);
        return;
      }
      
      for (let i = start; i < numbers.length && combinations.length < count; i++) {
        combo.push(numbers[i]);
        generate(i + 1, combo);
        combo.pop();
      }
    };
    
    generate(0, []);
    return combinations.slice(0, count);
  }
  
  private calculateConfidence(frequencies: Map<string, number>): number {
    // Simple confidence based on data availability
    const totalCount = Array.from(frequencies.values()).reduce((a, b) => a + b, 0);
    return Math.min(95, Math.max(30, totalCount / 10));
  }
}

// Schedule configuration for each region
export const DRAW_SCHEDULES = {
  NORTH: {
    time: '18:15', // 6:15 PM daily
    predictionOffset: 45, // minutes before
  },
  CENTRAL: {
    time: '17:15', // 5:15 PM Wed, Sat, Sun
    days: [3, 6, 0], // Wed, Sat, Sun
    predictionOffset: 45,
  },
  SOUTH: {
    time: '16:15', // 4:15 PM Mon, Tue, Thu, Fri, Sat
    days: [1, 2, 4, 5, 6],
    predictionOffset: 45,
  },
};
