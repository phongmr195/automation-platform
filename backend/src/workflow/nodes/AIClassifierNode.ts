/**
 * AI Classifier Node
 * Classify text into predefined categories using AI
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { AIModelService } from '../ai/AIModelService';
import { AIClassifierParams, AINodeConfig, AITool } from '../ai/types';

export class AIClassifierExecutor implements INodeExecutor {
  validate(node: WorkflowNode): boolean | string {
      throw new Error('Method not implemented.');
  }
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const params = node.data.parameters as AIClassifierParams;
      
      // Validate required parameters
      if (!params.input) {
        throw new Error('Input text is required');
      }
      if (!params.classes || params.classes.length === 0) {
        throw new Error('At least one class is required');
      }

      // Build classification tool
      const classificationTool = this.buildClassificationTool(params);

      // Build prompt
      const prompt = this.buildClassificationPrompt(params);

      // Build config
      const config: AINodeConfig = {
        provider: params.config?.provider || 'anthropic',
        model: params.config?.model || 'claude-sonnet-4.5',
        temperature: params.config?.temperature ?? 0.1, // Very low temp for classification
        maxTokens: params.config?.maxTokens ?? 1024,
        caching: params.config?.caching ?? true,
        ...params.config,
      };

      // Execute with tool use
      const response = await AIModelService.execute({
        messages: [{ role: 'user', content: prompt }],
        config,
        systemPrompt: 'You are a text classification assistant. Classify text accurately into the provided categories.',
        tools: [classificationTool],
        toolChoice: { type: 'tool', name: 'classify_text' },
      });

      // Parse classification result
      let classifications: Array<{ label: string; confidence: number; reasoning?: string }> = [];

      if (response.toolCalls && response.toolCalls.length > 0) {
        const result = response.toolCalls[0].input;
        classifications = params.multiLabel ? result.labels : [result];
      } else {
        throw new Error('No classification result from AI');
      }

      // Filter by confidence threshold
      const threshold = params.confidenceThreshold ?? 0.5;
      classifications = classifications.filter(c => c.confidence >= threshold);

      // Sort by confidence
      classifications.sort((a, b) => b.confidence - a.confidence);

      const primaryLabel = classifications[0]?.label || 'unknown';

      console.log(`[AI Classifier] Model: ${response.model}, Tokens: ${response.usage.totalTokens}, Primary: ${primaryLabel}`);

      return {
        success: true,
        output: {
          classifications,
          primaryLabel,
          usage: response.usage,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI Classifier failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private buildClassificationTool(params: AIClassifierParams): AITool {
    const labelEnum = params.classes.map(c => c.label);

    if (params.multiLabel) {
      return {
        name: 'classify_text',
        description: 'Classify text into one or more categories',
        input_schema: {
          type: 'object',
          properties: {
            labels: {
              type: 'array',
              description: 'Array of applicable labels with confidence scores',
              items: {
                type: 'object',
                properties: {
                  label: {
                    type: 'string',
                    enum: labelEnum,
                    description: 'The classification label',
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score between 0 and 1',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief reasoning for this classification',
                  },
                },
                required: ['label', 'confidence'],
              },
            },
          },
          required: ['labels'],
        },
      };
    } else {
      return {
        name: 'classify_text',
        description: 'Classify text into a single category',
        input_schema: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              enum: labelEnum,
              description: 'The most appropriate classification label',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score between 0 and 1',
            },
            reasoning: {
              type: 'string',
              description: 'Brief reasoning for this classification',
            },
          },
          required: ['label', 'confidence'],
        },
      };
    }
  }

  private buildClassificationPrompt(params: AIClassifierParams): string {
    let prompt = `Classify the following text into one ${params.multiLabel ? 'or more' : ''} of the provided categories:\n\n`;
    prompt += `Text: "${params.input}"\n\n`;
    prompt += `Available categories:\n`;
    
    for (const cls of params.classes) {
      prompt += `- ${cls.label}: ${cls.description}`;
      if (cls.examples && cls.examples.length > 0) {
        prompt += `\n  Examples: ${cls.examples.map(e => `"${e}"`).join(', ')}`;
      }
      prompt += '\n';
    }
    
    if (params.confidenceThreshold) {
      prompt += `\nOnly include classifications with confidence >= ${params.confidenceThreshold}`;
    }
    
    return prompt;
  }
}
