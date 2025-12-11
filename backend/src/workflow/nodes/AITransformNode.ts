/**
 * AI Transform Node
 * Transform data using AI with structured output
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { AIModelService } from '../ai/AIModelService';
import { AITransformParams, AINodeConfig, AIMessage } from '../ai/types';
import Ajv from 'ajv';

const ajv = new Ajv();

export class AITransformExecutor implements INodeExecutor {
  validate(node: WorkflowNode): boolean | string {
      throw new Error('Method not implemented.');
  }
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const params = node.data.parameters as AITransformParams;
      
      // Validate required parameters
      if (!params.input) {
        throw new Error('Input is required');
      }
      if (!params.instruction) {
        throw new Error('Transformation instruction is required');
      }

      // Build transformation prompt
      const prompt = this.buildTransformPrompt(params);

      // Build config
      const config: AINodeConfig = {
        provider: params.config?.provider || 'anthropic',
        model: params.config?.model || 'claude-sonnet-4.5',
        temperature: params.config?.temperature ?? 0.3, // Lower temp for structured output
        maxTokens: params.config?.maxTokens ?? 4096,
        caching: params.config?.caching ?? true,
        ...params.config,
      };

      // Execute AI request
      const response = await AIModelService.execute({
        messages: [{ role: 'user', content: prompt }],
        config,
        systemPrompt: 'You are a data transformation assistant. Always return output in the requested format.',
      });

      // Parse and validate output
      const transformed = this.parseOutput(response.content, params.outputFormat || 'text');
      
      // Validate against schema if provided
      const validationErrors: string[] = [];
      if (params.outputSchema) {
        const valid = ajv.validate(params.outputSchema, transformed);
        if (!valid && ajv.errors) {
          validationErrors.push(...ajv.errors.map(e => `${e.instancePath} ${e.message}`));
        }
      }

      console.log(`[AI Transform] Model: ${response.model}, Tokens: ${response.usage.totalTokens}, Cost: $${response.usage.estimatedCost?.toFixed(4)}`);

      return {
        success: true,
        output: {
          transformed,
          usage: response.usage,
          validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI Transform failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private buildTransformPrompt(params: AITransformParams): string {
    let prompt = `Transform the following data according to the instruction.\n\n`;
    prompt += `Input data:\n${JSON.stringify(params.input, null, 2)}\n\n`;
    prompt += `Instruction: ${params.instruction}\n\n`;
    
    if (params.outputFormat === 'json') {
      prompt += `Return the result as valid JSON.`;
      if (params.outputSchema) {
        prompt += `\n\nExpected schema:\n${JSON.stringify(params.outputSchema, null, 2)}`;
      }
    } else if (params.outputFormat === 'markdown') {
      prompt += `Return the result in Markdown format.`;
    } else if (params.outputFormat === 'code') {
      prompt += `Return the result as code.`;
    } else {
      prompt += `Return the result as plain text.`;
    }
    
    return prompt;
  }

  private parseOutput(content: string, format: string): any {
    if (format === 'json') {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      
      try {
        return JSON.parse(jsonStr.trim());
      } catch (error) {
        throw new Error(`Failed to parse JSON output: ${error}`);
      }
    }
    
    return content;
  }
}
