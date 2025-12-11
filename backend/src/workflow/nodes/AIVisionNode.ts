/**
 * AI Vision Node
 * Analyze images using vision-enabled AI models
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { AIModelService } from '../ai/AIModelService';
import { AIVisionParams, AINodeConfig, AIContentBlock } from '../ai/types';

export class AIVisionExecutor implements INodeExecutor {
  validate(node: WorkflowNode): boolean | string {
      throw new Error('Method not implemented.');
  }
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const params = node.data.parameters as AIVisionParams;
      
      // Validate required parameters
      if (!params.images || params.images.length === 0) {
        throw new Error('At least one image is required');
      }
      if (!params.prompt) {
        throw new Error('Prompt is required');
      }

      // Build content blocks with images
      const contentBlocks = this.buildContentBlocks(params);

      // Build config - ensure vision-capable model
      const config: AINodeConfig = {
        provider: params.config?.provider || 'anthropic',
        model: params.config?.model || 'claude-sonnet-4.5',
        temperature: params.config?.temperature ?? 0.5,
        maxTokens: params.config?.maxTokens ?? 4096,
        caching: params.config?.caching ?? false, // Usually disable caching for images
        ...params.config,
      };

      // Validate model supports vision
      const modelMetadata = AIModelService.getModelMetadata(config.model);
      if (!modelMetadata.supportsVision) {
        throw new Error(`Model ${config.model} does not support vision. Use claude-sonnet-4.5, gpt-4.5-turbo, or gemini-2.0-flash.`);
      }

      // Build system prompt based on task
      const systemPrompt = this.buildSystemPrompt(params.task);

      // Execute AI request
      const response = await AIModelService.execute({
        messages: [{ role: 'user', content: contentBlocks }],
        config,
        systemPrompt,
      });

      // Parse structured output if needed
      let structured: Record<string, any> | undefined;
      if (params.task === 'extract' || params.task === 'detect') {
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            structured = JSON.parse(jsonMatch[0]);
          }
        } catch (error) {
          // JSON parsing failed, keep as undefined
        }
      }

      console.log(`[AI Vision] Model: ${response.model}, Images: ${params.images.length}, Tokens: ${response.usage.totalTokens}, Cost: $${response.usage.estimatedCost?.toFixed(4)}`);

      return {
        success: true,
        output: {
          analysis: response.content,
          structured,
          usage: response.usage,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI Vision failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private buildContentBlocks(params: AIVisionParams): AIContentBlock[] {
    const blocks: AIContentBlock[] = [];

    // Add images
    for (const image of params.images) {
      if (image.type === 'url') {
        blocks.push({
          type: 'image',
          source: {
            type: 'url',
            url: image.data,
          },
        });
      } else {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType || 'image/jpeg',
            data: image.data,
          },
        });
      }
    }

    // Add prompt text
    blocks.push({
      type: 'text',
      text: params.prompt,
    });

    return blocks;
  }

  private buildSystemPrompt(task?: string): string {
    switch (task) {
      case 'describe':
        return 'You are an image description assistant. Provide detailed, accurate descriptions of images.';
      case 'analyze':
        return 'You are an image analysis assistant. Analyze images thoroughly and provide insights.';
      case 'extract':
        return 'You are a data extraction assistant. Extract structured information from images. Return results as JSON.';
      case 'ocr':
        return 'You are an OCR assistant. Extract all text from images accurately, maintaining structure and formatting.';
      case 'detect':
        return 'You are an object detection assistant. Identify and locate objects in images. Return results as JSON with object names and locations.';
      default:
        return 'You are a vision assistant. Analyze images and respond to user queries accurately.';
    }
  }
}
