/**
 * Lottery Prediction Node
 * Generates lottery predictions using AI
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { LotteryPredictor, type Region } from '../../services/lotteryPrediction';
import { AIPredictionService } from '../../services/aiPredictionService';

export class LotteryPredictionExecutor implements INodeExecutor {
  private lotteryService: LotteryPredictor;
  private aiService: AIPredictionService;

  constructor() {
    this.lotteryService = new LotteryPredictor();
    this.aiService = new AIPredictionService();
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { region, provider = 'groq', useAI = true } = node.data.parameters;

      if (!region || !['NORTH', 'CENTRAL', 'SOUTH'].includes(region)) {
        throw new Error('Invalid region. Must be NORTH, CENTRAL, or SOUTH');
      }

      let prediction;
      
      if (useAI) {
        // AI-based prediction
        switch (provider) {
          case 'claude':
            prediction = await this.aiService.predictWithClaude(region);
            break;
          case 'gpt':
            prediction = await this.aiService.predictWithGPT(region);
            break;
          case 'gemini':
            prediction = await this.aiService.predictWithGemini(region);
            break;
          case 'groq':
            prediction = await this.aiService.predictWithGroq(region);
            break;
          default:
            prediction = await this.aiService.predictWithGroq(region);
        }
      } else {
        // Frequency-based prediction
        prediction = await this.lotteryService.predictForRegion(region as Region, new Date());
      }

      return {
        success: true,
        output: {
          region,
          provider: useAI ? provider : 'frequency',
          prediction,
          timestamp: new Date().toISOString(),
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Lottery prediction failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const { region } = node.data.parameters;
    
    if (!region) {
      return 'Region is required';
    }
    
    if (!['NORTH', 'CENTRAL', 'SOUTH'].includes(region)) {
      return 'Region must be NORTH, CENTRAL, or SOUTH';
    }
    
    return true;
  }
}
