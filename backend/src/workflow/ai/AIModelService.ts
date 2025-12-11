/**
 * AI Model Service
 * Unified interface for all AI providers with streaming, caching, and monitoring
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import IORedis from 'ioredis';
import {
  AIProvider,
  AIModel,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AINodeConfig,
  AITokenUsage,
  AINodeError,
  AIErrorCode,
  CacheEntry,
  AIProviderHealth,
} from './types';

// ============= Provider Clients =============

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============= Model Configuration =============

interface ModelMetadata {
  provider: AIProvider;
  contextWindow: number;
  maxOutput: number;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  latencyTier: 'fast' | 'medium' | 'slow';
}

const MODEL_METADATA: Record<AIModel, ModelMetadata> = {
  'claude-sonnet-4.5': {
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 8192,
    costPer1MInputTokens: 3.0,
    costPer1MOutputTokens: 15.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'medium',
  },
  'claude-opus-4.5': {
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 8192,
    costPer1MInputTokens: 15.0,
    costPer1MOutputTokens: 75.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'slow',
  },
  'claude-sonnet-3.5': {
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 8192,
    costPer1MInputTokens: 3.0,
    costPer1MOutputTokens: 15.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'fast',
  },
  'gpt-4.5-turbo': {
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 16384,
    costPer1MInputTokens: 2.5,
    costPer1MOutputTokens: 10.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'medium',
  },
  'gpt-4': {
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 8192,
    costPer1MInputTokens: 30.0,
    costPer1MOutputTokens: 60.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'slow',
  },
  'gemini-2.0-flash': {
    provider: 'google',
    contextWindow: 1000000,
    maxOutput: 8192,
    costPer1MInputTokens: 0.075,
    costPer1MOutputTokens: 0.3,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'fast',
  },
  'gemini-1.5-pro': {
    provider: 'google',
    contextWindow: 2000000,
    maxOutput: 8192,
    costPer1MInputTokens: 1.25,
    costPer1MOutputTokens: 5.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'medium',
  },
  'gemini-2.0-flash-thinking-exp': {
    provider: 'google',
    contextWindow: 1000000,
    maxOutput: 8192,
    costPer1MInputTokens: 0.075,
    costPer1MOutputTokens: 0.3,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'medium',
  },
  'azure-gpt-4': {
    provider: 'azure',
    contextWindow: 128000,
    maxOutput: 8192,
    costPer1MInputTokens: 30.0,
    costPer1MOutputTokens: 60.0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    latencyTier: 'medium',
  },
  'llama-3.3-70b': {
    provider: 'groq',
    contextWindow: 128000,
    maxOutput: 8192,
    costPer1MInputTokens: 0.59,
    costPer1MOutputTokens: 0.79,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    latencyTier: 'fast',
  },
  'mixtral-8x7b': {
    provider: 'groq',
    contextWindow: 32000,
    maxOutput: 8192,
    costPer1MInputTokens: 0.24,
    costPer1MOutputTokens: 0.24,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    latencyTier: 'fast',
  },
};

// ============= AI Model Service =============

export class AIModelService {
  private static providerHealth = new Map<AIProvider, AIProviderHealth>();

  /**
   * Execute AI request with automatic provider routing
   */
  static async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const { config } = request;

    // Check cache first
    if (config.caching) {
      const cached = await this.getFromCache(request);
      if (cached) {
        return {
          ...cached,
          cached: true,
          latency: Date.now() - startTime,
        };
      }
    }

    // Execute with retry logic
    let lastError: Error | null = null;
    const maxRetries = config.retry ?? 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.executeWithProvider(request);
        
        // Cache successful response
        if (config.caching) {
          await this.saveToCache(request, response);
        }

        return {
          ...response,
          cached: false,
          latency: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.isRetryableError(error as AINodeError)) {
          if (attempt < maxRetries - 1) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }

        // Try fallback model if configured
        if (config.fallbackModel && attempt === maxRetries - 1) {
          try {
            const fallbackRequest = {
              ...request,
              config: { ...config, model: config.fallbackModel, fallbackModel: undefined },
            };
            return await this.executeWithProvider(fallbackRequest);
          } catch (fallbackError) {
            // Fallback also failed, throw original error
          }
        }

        throw error;
      }
    }

    throw lastError || new Error('AI execution failed');
  }

  /**
   * Execute with streaming support
   */
  static async executeStreaming(
    request: AIRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const { config } = request;
    const metadata = MODEL_METADATA[config.model];

    if (!metadata.supportsStreaming) {
      throw new AINodeError(
        `Model ${config.model} does not support streaming`,
        AIErrorCode.INVALID_REQUEST,
        metadata.provider,
        config.model,
        false
      );
    }

    switch (metadata.provider) {
      case 'anthropic':
        return await this.streamAnthropic(request, onChunk);
      case 'openai':
        return await this.streamOpenAI(request, onChunk);
      case 'google':
        return await this.streamGoogle(request, onChunk);
      default:
        throw new AINodeError(
          `Streaming not implemented for provider: ${metadata.provider}`,
          AIErrorCode.INVALID_REQUEST,
          metadata.provider,
          config.model,
          false
        );
    }
  }

  /**
   * Route to appropriate provider
   */
  private static async executeWithProvider(request: AIRequest): Promise<AIResponse> {
    const { config } = request;
    const metadata = MODEL_METADATA[config.model];

    switch (metadata.provider) {
      case 'anthropic':
        return await this.executeAnthropic(request);
      case 'openai':
        return await this.executeOpenAI(request);
      case 'google':
        return await this.executeGoogle(request);
      default:
        throw new AINodeError(
          `Provider ${metadata.provider} not implemented`,
          AIErrorCode.MODEL_UNAVAILABLE,
          metadata.provider,
          config.model,
          false
        );
    }
  }

  /**
   * Execute with Anthropic Claude
   */
  private static async executeAnthropic(request: AIRequest): Promise<AIResponse> {
    const { messages, config, systemPrompt, tools } = request;
    const startTime = Date.now();

    try {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: typeof m.content === 'string' ? m.content : m.content,
        })),
        tools: tools as any,
        // @ts-ignore
        tool_choice: request.toolChoice,
        stop_sequences: config.stopSequences,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      const toolCalls = response.content
        .filter(block => block.type === 'tool_use')
        .map(block => ({
          id: (block as any).id,
          name: (block as any).name,
          input: (block as any).input,
        }));

      return {
        content,
        rawContent: response.content as any,
        stopReason: response.stop_reason as any,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          estimatedCost: this.calculateCost(config.model, response.usage.input_tokens, response.usage.output_tokens),
        },
        model: response.model,
        latency: Date.now() - startTime,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

    } catch (error: any) {
      throw this.handleAnthropicError(error, config.model);
    }
  }

  /**
   * Execute with OpenAI GPT
   */
  private static async executeOpenAI(request: AIRequest): Promise<AIResponse> {
    const { messages, config, systemPrompt, tools } = request;
    const startTime = Date.now();

    try {
      const systemMessage = systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : [];
      
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          ...systemMessage,
          ...messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          })),
        ] as any,
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
        stop: config.stopSequences,
        tools: tools as any,
        tool_choice: request.toolChoice as any,
      });

      const choice = response.choices[0];
      const content = choice.message.content || '';
      const toolCalls = choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      }));

      return {
        content,
        rawContent: [{ type: 'text', text: content }],
        stopReason: choice.finish_reason as any,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
          estimatedCost: this.calculateCost(
            config.model,
            response.usage?.prompt_tokens ?? 0,
            response.usage?.completion_tokens ?? 0
          ),
        },
        model: response.model,
        latency: Date.now() - startTime,
        toolCalls,
      };

    } catch (error: any) {
      throw this.handleOpenAIError(error, config.model);
    }
  }

  /**
   * Execute with Google Gemini
   */
  private static async executeGoogle(request: AIRequest): Promise<AIResponse> {
    const { messages, config, systemPrompt } = request;
    const startTime = Date.now();

    try {
      const model = googleAI.getGenerativeModel({ 
        model: config.model,
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: messages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
        })),
        generationConfig: {
          maxOutputTokens: config.maxTokens ?? 4096,
          temperature: config.temperature ?? 0.7,
          topP: config.topP,
          topK: config.topK,
          stopSequences: config.stopSequences,
        },
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(
        typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content)
      );

      const response = result.response;
      const content = response.text();

      return {
        content,
        rawContent: [{ type: 'text', text: content }],
        stopReason: 'end_turn',
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
          estimatedCost: this.calculateCost(
            config.model,
            response.usageMetadata?.promptTokenCount ?? 0,
            response.usageMetadata?.candidatesTokenCount ?? 0
          ),
        },
        model: config.model,
        latency: Date.now() - startTime,
      };

    } catch (error: any) {
      throw this.handleGoogleError(error, config.model);
    }
  }

  /**
   * Streaming for Anthropic
   */
  private static async streamAnthropic(
    request: AIRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const { messages, config, systemPrompt } = request;
    const startTime = Date.now();

    const stream = await anthropic.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })) as any,
    });

    let fullContent = '';
    let usage: AITokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    stream.on('text', (text) => {
      fullContent += text;
      onChunk({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text },
      });
    });

    const finalMessage = await stream.finalMessage();
    
    usage = {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      estimatedCost: this.calculateCost(config.model, finalMessage.usage.input_tokens, finalMessage.usage.output_tokens),
    };

    return {
      content: fullContent,
      rawContent: finalMessage.content as any,
      stopReason: finalMessage.stop_reason as any,
      usage,
      model: finalMessage.model,
      latency: Date.now() - startTime,
    };
  }

  /**
   * Streaming for OpenAI
   */
  private static async streamOpenAI(
    request: AIRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const { messages, config, systemPrompt } = request;
    const startTime = Date.now();

    const systemMessage = systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : [];
    
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages: [
        ...systemMessage,
        ...messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      ] as any,
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
      stream: true,
    });

    let fullContent = '';
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onChunk({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: delta },
        });
      }
    }

    // Note: OpenAI streaming doesn't provide usage in stream, estimate it
    const estimatedInputTokens = Math.ceil(JSON.stringify(messages).length / 4);
    const estimatedOutputTokens = Math.ceil(fullContent.length / 4);

    return {
      content: fullContent,
      rawContent: [{ type: 'text', text: fullContent }],
      stopReason: 'end_turn',
      usage: {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens,
        estimatedCost: this.calculateCost(config.model, estimatedInputTokens, estimatedOutputTokens),
      },
      model: config.model,
      latency: Date.now() - startTime,
    };
  }

  /**
   * Streaming for Google
   */
  private static async streamGoogle(
    request: AIRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const { messages, config, systemPrompt } = request;
    const startTime = Date.now();

    const model = googleAI.getGenerativeModel({ 
      model: config.model,
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      })),
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessageStream(
      typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content)
    );

    let fullContent = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullContent += text;
      onChunk({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text },
      });
    }

    const response = await result.response;

    return {
      content: fullContent,
      rawContent: [{ type: 'text', text: fullContent }],
      stopReason: 'end_turn',
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        estimatedCost: this.calculateCost(
          config.model,
          response.usageMetadata?.promptTokenCount ?? 0,
          response.usageMetadata?.candidatesTokenCount ?? 0
        ),
      },
      model: config.model,
      latency: Date.now() - startTime,
    };
  }

  // ============= Caching =============

  private static async getFromCache(request: AIRequest): Promise<AIResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        
        // Update hit count
        entry.hitCount++;
        await redis.setex(cacheKey, entry.ttl, JSON.stringify(entry));
        
        return entry.response;
      }
      
      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private static async saveToCache(request: AIRequest, response: AIResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const ttl = request.config.cacheTTL ?? 3600; // 1 hour default
      
      const entry: CacheEntry = {
        key: cacheKey,
        response,
        timestamp: Date.now(),
        ttl,
        hitCount: 0,
        tokensSaved: 0,
      };
      
      await redis.setex(cacheKey, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  private static generateCacheKey(request: AIRequest): string {
    const { messages, config, systemPrompt } = request;
    const key = JSON.stringify({ messages, model: config.model, systemPrompt });
    return `ai:cache:${Buffer.from(key).toString('base64').slice(0, 64)}`;
  }

  // ============= Error Handling =============

  private static handleAnthropicError(error: any, model: AIModel): AINodeError {
    if (error.status === 429) {
      return new AINodeError(
        'Rate limit exceeded',
        AIErrorCode.RATE_LIMIT_EXCEEDED,
        'anthropic',
        model,
        true
      );
    }
    if (error.status === 400 && error.message?.includes('prompt is too long')) {
      return new AINodeError(
        'Context length exceeded',
        AIErrorCode.CONTEXT_LENGTH_EXCEEDED,
        'anthropic',
        model,
        false
      );
    }
    return new AINodeError(
      error.message || 'Anthropic API error',
      AIErrorCode.SERVER_ERROR,
      'anthropic',
      model,
      false
    );
  }

  private static handleOpenAIError(error: any, model: AIModel): AINodeError {
    if (error.status === 429) {
      return new AINodeError(
        'Rate limit exceeded',
        AIErrorCode.RATE_LIMIT_EXCEEDED,
        'openai',
        model,
        true
      );
    }
    if (error.code === 'context_length_exceeded') {
      return new AINodeError(
        'Context length exceeded',
        AIErrorCode.CONTEXT_LENGTH_EXCEEDED,
        'openai',
        model,
        false
      );
    }
    return new AINodeError(
      error.message || 'OpenAI API error',
      AIErrorCode.SERVER_ERROR,
      'openai',
      model,
      false
    );
  }

  private static handleGoogleError(error: any, model: AIModel): AINodeError {
    if (error.message?.includes('quota')) {
      return new AINodeError(
        'Rate limit exceeded',
        AIErrorCode.RATE_LIMIT_EXCEEDED,
        'google',
        model,
        true
      );
    }
    return new AINodeError(
      error.message || 'Google AI error',
      AIErrorCode.SERVER_ERROR,
      'google',
      model,
      false
    );
  }

  private static isRetryableError(error: AINodeError): boolean {
    return error.retryable || [
      AIErrorCode.RATE_LIMIT_EXCEEDED,
      AIErrorCode.TIMEOUT,
      AIErrorCode.NETWORK_ERROR,
      AIErrorCode.SERVER_ERROR,
    ].includes(error.code);
  }

  // ============= Utilities =============

  private static calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const metadata = MODEL_METADATA[model];
    return (
      (inputTokens / 1_000_000) * metadata.costPer1MInputTokens +
      (outputTokens / 1_000_000) * metadata.costPer1MOutputTokens
    );
  }

  /**
   * Get model metadata
   */
  static getModelMetadata(model: AIModel): ModelMetadata {
    return MODEL_METADATA[model];
  }

  /**
   * Recommend model based on criteria
   */
  static recommendModel(criteria: {
    taskType?: 'general' | 'reasoning' | 'vision' | 'speed';
    budgetPriority?: 'cost' | 'quality' | 'speed';
    requiresVision?: boolean;
    requiresTools?: boolean;
  }): AIModel {
    const { taskType = 'general', budgetPriority = 'quality', requiresVision, requiresTools } = criteria;

    // Filter by requirements
    let candidates = Object.entries(MODEL_METADATA).filter(([_, meta]) => {
      if (requiresVision && !meta.supportsVision) return false;
      if (requiresTools && !meta.supportsTools) return false;
      return true;
    });

    // Sort by priority
    if (budgetPriority === 'cost') {
      candidates.sort((a, b) => a[1].costPer1MInputTokens - b[1].costPer1MInputTokens);
    } else if (budgetPriority === 'speed') {
      const tierOrder = { fast: 0, medium: 1, slow: 2 };
      candidates.sort((a, b) => tierOrder[a[1].latencyTier] - tierOrder[b[1].latencyTier]);
    } else {
      // Quality priority - prefer Sonnet 4.5 for general, Opus for reasoning
      if (taskType === 'reasoning') {
        return 'claude-opus-4.5';
      }
      return 'claude-sonnet-4.5';
    }

    return candidates[0][0] as AIModel;
  }
}
