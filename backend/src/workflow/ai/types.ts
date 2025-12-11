/**
 * AI Node Types & Interfaces
 * Type definitions for AI-powered workflow nodes
 */

// ============= AI Model Types =============

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'azure' | 'groq' | 'local';

export type AIModel = 
  | 'claude-sonnet-4.5'
  | 'claude-opus-4.5'
  | 'claude-sonnet-3.5'
  | 'gpt-4.5-turbo'
  | 'gpt-4'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.0-flash-thinking-exp'
  | 'azure-gpt-4'
  | 'llama-3.3-70b'
  | 'mixtral-8x7b';

export interface AIModelConfig {
  provider: AIProvider;
  model: AIModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  timeout?: number;
}

// ============= AI Node Configuration =============

export interface AINodeConfig extends AIModelConfig {
  // Streaming
  streaming?: boolean;
  streamingCallback?: (chunk: string) => void;
  
  // Retry & Timeout
  retry?: number;
  timeout?: number;
  onError?: 'stop' | 'fallback' | 'continue';
  fallbackModel?: AIModel;
  
  // Caching
  caching?: boolean;
  cacheTTL?: number; // seconds
  cacheKey?: string;
  
  // Token Management
  maxInputTokens?: number;
  maxOutputTokens?: number;
  tokenOptimization?: 'aggressive' | 'balanced' | 'quality';
  
  // Logging & Monitoring
  logTokenUsage?: boolean;
  logLatency?: boolean;
  trackCost?: boolean;
  
  // Rate Limiting
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

// ============= AI Request & Response =============

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AIContentBlock[];
  name?: string;
  metadata?: Record<string, any>;
}

export interface AIContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    media_type?: string;
    data?: string;
    url?: string;
  };
  tool_use_id?: string;
  tool_name?: string;
  input?: any;
  content?: any;
}

export interface AIRequest {
  messages: AIMessage[];
  config: AINodeConfig;
  systemPrompt?: string;
  tools?: AITool[];
  toolChoice?: 'auto' | 'none' | { type: 'tool'; name: string };
}

export interface AIResponse {
  content: string;
  rawContent: AIContentBlock[];
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage: AITokenUsage;
  model: string;
  latency: number;
  cached?: boolean;
  toolCalls?: AIToolCall[];
}

export interface AIStreamChunk {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop';
  index?: number;
  delta?: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
  content_block?: AIContentBlock;
  message?: Partial<AIResponse>;
  usage?: Partial<AITokenUsage>;
}

export interface AITokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalTokens: number;
  estimatedCost?: number; // USD
}

// ============= AI Tools (Function Calling) =============

export interface AITool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AIToolCall {
  id: string;
  name: string;
  input: any;
}

// ============= AI Node Specific Types =============

// AI Invoke Node
export interface AIInvokeParams {
  prompt: string;
  systemPrompt?: string;
  messages?: AIMessage[];
  config: AINodeConfig;
  variables?: Record<string, any>;
}

export interface AIInvokeOutput {
  response: string;
  usage: AITokenUsage;
  model: string;
  latency: number;
  cached: boolean;
}

// AI Transform Node
export interface AITransformParams {
  input: any;
  instruction: string;
  outputFormat?: 'text' | 'json' | 'markdown' | 'code';
  outputSchema?: Record<string, any>; // JSON Schema
  config: AINodeConfig;
}

export interface AITransformOutput {
  transformed: any;
  usage: AITokenUsage;
  validationErrors?: string[];
}

// AI Extract Node
export interface AIExtractParams {
  text: string;
  extractionSchema: {
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description: string;
      required?: boolean;
    }>;
  };
  config: AINodeConfig;
}

export interface AIExtractOutput {
  extracted: Record<string, any>;
  confidence: number;
  usage: AITokenUsage;
}

// AI Classifier Node
export interface AIClassifierParams {
  input: string;
  classes: Array<{
    label: string;
    description: string;
    examples?: string[];
  }>;
  multiLabel?: boolean;
  confidenceThreshold?: number;
  config: AINodeConfig;
}

export interface AIClassifierOutput {
  classifications: Array<{
    label: string;
    confidence: number;
    reasoning?: string;
  }>;
  primaryLabel: string;
  usage: AITokenUsage;
}

// AI Vision Node
export interface AIVisionParams {
  images: Array<{
    type: 'url' | 'base64';
    data: string;
    mediaType?: string;
  }>;
  prompt: string;
  task?: 'describe' | 'analyze' | 'extract' | 'ocr' | 'detect';
  config: AINodeConfig;
}

export interface AIVisionOutput {
  analysis: string;
  structured?: Record<string, any>;
  usage: AITokenUsage;
}

// AI Planner Node (Agent-like)
export interface AIPlannerParams {
  goal: string;
  context: Record<string, any>;
  availableTools: AITool[];
  maxSteps?: number;
  config: AINodeConfig;
}

export interface AIPlannerOutput {
  plan: Array<{
    step: number;
    action: string;
    tool?: string;
    params?: any;
    reasoning: string;
  }>;
  finalOutput?: any;
  usage: AITokenUsage;
  steps: number;
}

// ============= Error Types =============

export class AINodeError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public provider?: AIProvider,
    public model?: AIModel,
    public retryable: boolean = false,
    public usage?: AITokenUsage
  ) {
    super(message);
    this.name = 'AINodeError';
  }
}

export enum AIErrorCode {
  // Client Errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  INVALID_SCHEMA = 'INVALID_SCHEMA',
  
  // Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Content Errors
  CONTENT_FILTERED = 'CONTENT_FILTERED',
  UNSAFE_CONTENT = 'UNSAFE_CONTENT',
  
  // Execution Errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  OUTPUT_VALIDATION_FAILED = 'OUTPUT_VALIDATION_FAILED',
  CACHE_ERROR = 'CACHE_ERROR',
}

// ============= Model Selection Strategy =============

export interface ModelRecommendation {
  model: AIModel;
  provider: AIProvider;
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  capabilities: string[];
}

export interface ModelSelectionCriteria {
  taskType: 'general' | 'reasoning' | 'vision' | 'speed' | 'cost';
  complexity: 'simple' | 'medium' | 'complex';
  inputSize: number; // tokens
  budgetPriority: 'cost' | 'quality' | 'speed';
  requiresStreaming?: boolean;
  requiresTools?: boolean;
  requiresVision?: boolean;
}

// ============= Caching & Optimization =============

export interface CacheEntry {
  key: string;
  response: AIResponse;
  timestamp: number;
  ttl: number;
  hitCount: number;
  tokensSaved: number;
}

export interface TokenOptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  method: 'compression' | 'summarization' | 'truncation';
  quality: number; // 0-1
}

// ============= Observability =============

export interface AINodeMetrics {
  nodeId: string;
  executionId: string;
  model: AIModel;
  provider: AIProvider;
  latency: number;
  usage: AITokenUsage;
  cost: number;
  cached: boolean;
  error?: string;
  timestamp: Date;
}

export interface AIProviderHealth {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'down';
  latency: number; // avg in ms
  errorRate: number; // 0-1
  lastChecked: Date;
}
