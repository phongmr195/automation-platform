/**
 * AI Extract Node
 * Extract structured data from unstructured text using AI
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { AIModelService } from '../ai/AIModelService';
import { AIExtractParams, AINodeConfig, AIMessage, AITool } from '../ai/types';

export class AIExtractExecutor implements INodeExecutor {
  validate(node: WorkflowNode): boolean | string {
      throw new Error('Method not implemented.');
  }
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const params = node.data.parameters as AIExtractParams;
      
      // Validate required parameters
      if (!params.text) {
        throw new Error('Text is required');
      }
      if (!params.extractionSchema || !params.extractionSchema.fields) {
        throw new Error('Extraction schema is required');
      }

      // Build extraction tool
      const extractionTool = this.buildExtractionTool(params);

      // Build prompt
      const prompt = this.buildExtractionPrompt(params);

      // Build config
      const config: AINodeConfig = {
        provider: params.config?.provider || 'anthropic',
        model: params.config?.model || 'claude-sonnet-4.5',
        temperature: params.config?.temperature ?? 0.2, // Low temp for extraction
        maxTokens: params.config?.maxTokens ?? 4096,
        caching: params.config?.caching ?? true,
        ...params.config,
      };

      // Execute with tool use
      const response = await AIModelService.execute({
        messages: [{ role: 'user', content: prompt }],
        config,
        systemPrompt: 'You are a data extraction assistant. Extract information accurately according to the schema.',
        tools: [extractionTool],
        toolChoice: { type: 'tool', name: 'extract_data' },
      });

      // Parse tool call result
      let extracted: Record<string, any> = {};
      let confidence = 0;

      if (response.toolCalls && response.toolCalls.length > 0) {
        extracted = response.toolCalls[0].input;
        confidence = this.calculateConfidence(extracted, params.extractionSchema.fields);
      } else {
        // Fallback: try to parse from text response
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extracted = JSON.parse(jsonMatch[0]);
            confidence = 0.7; // Lower confidence for fallback
          }
        } catch (error) {
          throw new Error('Failed to extract data from response');
        }
      }

      console.log(`[AI Extract] Model: ${response.model}, Tokens: ${response.usage.totalTokens}, Confidence: ${confidence.toFixed(2)}`);

      return {
        success: true,
        output: {
          extracted,
          confidence,
          usage: response.usage,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI Extract failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private buildExtractionTool(params: AIExtractParams): AITool {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of params.extractionSchema.fields) {
      properties[field.name] = {
        type: field.type,
        description: field.description,
      };
      
      if (field.type === 'array') {
        properties[field.name].items = { type: 'string' };
      }
      
      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      name: 'extract_data',
      description: 'Extract structured data from the text according to the schema',
      input_schema: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
    };
  }

  private buildExtractionPrompt(params: AIExtractParams): string {
    let prompt = `Extract structured information from the following text:\n\n`;
    prompt += `${params.text}\n\n`;
    prompt += `Extract the following fields:\n`;
    
    for (const field of params.extractionSchema.fields) {
      prompt += `- ${field.name} (${field.type}): ${field.description}`;
      if (field.required) {
        prompt += ' [REQUIRED]';
      }
      prompt += '\n';
    }
    
    return prompt;
  }

  private calculateConfidence(extracted: Record<string, any>, fields: any[]): number {
    const requiredFields = fields.filter(f => f.required);
    if (requiredFields.length === 0) return 1.0;
    
    const extractedRequiredCount = requiredFields.filter(f => 
      extracted[f.name] !== undefined && extracted[f.name] !== null && extracted[f.name] !== ''
    ).length;
    
    return extractedRequiredCount / requiredFields.length;
  }
}
