/**
 * AI Invoke Node
 * General-purpose AI text generation with streaming support
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { AIModelService } from '../ai/AIModelService';
import { AIInvokeParams, AINodeConfig, AIMessage } from '../ai/types';

export class AIInvokeExecutor implements INodeExecutor {
  validate(node: WorkflowNode): boolean | string {
      throw new Error('Method not implemented.');
  }
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const params = node.data.parameters as AIInvokeParams;
      
      // Validate required parameters
      if (!params.prompt && !params.messages) {
        throw new Error('Either prompt or messages is required');
      }

      // Build messages array
      const messages: AIMessage[] = params.messages || [
        { role: 'user', content: this.interpolatePrompt(params.prompt, context) }
      ];

      // Build config with defaults
      const config: AINodeConfig = {
        provider: params.config?.provider || 'anthropic',
        model: params.config?.model || 'claude-sonnet-4.5',
        temperature: params.config?.temperature ?? 0.7,
        maxTokens: params.config?.maxTokens ?? 4096,
        streaming: params.config?.streaming ?? false,
        retry: params.config?.retry ?? 3,
        timeout: params.config?.timeout ?? 30000,
        caching: params.config?.caching ?? true,
        cacheTTL: params.config?.cacheTTL ?? 3600,
        logTokenUsage: params.config?.logTokenUsage ?? true,
        ...params.config,
      };

      // Execute AI request
      const response = await AIModelService.execute({
        messages,
        config,
        systemPrompt: params.systemPrompt,
      });

      // Log token usage if enabled
      if (config.logTokenUsage) {
        console.log(`[AI Invoke] Model: ${response.model}, Tokens: ${response.usage.totalTokens}, Cost: $${response.usage.estimatedCost?.toFixed(4)}, Latency: ${response.latency}ms, Cached: ${response.cached}`);
      }

      return {
        success: true,
        output: {
          response: response.content,
          usage: response.usage,
          model: response.model,
          latency: response.latency,
          cached: response.cached,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI Invoke failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Interpolate variables in prompt
   */
  private interpolatePrompt(prompt: string, context: ExecutionContext): string {
    if (!prompt) return '';
    
    let result = prompt;
    
    // Replace {{variable}} patterns
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getValueFromPath(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
    
    return result;
  }

  /**
   * Get value from dot-notation path
   */
  private getValueFromPath(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (part === 'nodeData' || part === 'variables') {
        value = context[part as keyof ExecutionContext];
        continue;
      }
      
      if (value instanceof Map) {
        value = value.get(part);
      } else {
        value = value?.[part];
      }
      
      if (value === undefined) break;
    }
    
    return value;
  }
}
