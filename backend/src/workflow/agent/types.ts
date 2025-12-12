/**
 * AI Agent System Types
 * Complete type definitions for autonomous AI agents in workflows
 */

import type { AIModel, AIProvider, AINodeConfig, AIMessage } from '../ai/types';
import type { ExecutionContext, WorkflowNode } from '../types';

// ============= Agent Core Types =============

export type AgentRole = 'assistant' | 'orchestrator' | 'specialist' | 'analyst' | 'custom';

export type AgentCapability = 
  | 'reasoning'
  | 'planning'
  | 'tool_calling'
  | 'code_generation'
  | 'data_transformation'
  | 'api_orchestration'
  | 'memory'
  | 'multi_step_execution';

export interface AgentConfig {
  // Identity
  id: string;
  name: string;
  role: AgentRole;
  description?: string;
  
  // AI Model Configuration
  model: AIModel;
  provider: AIProvider;
  temperature?: number;
  maxTokens?: number;
  
  // Behavior
  systemPrompt: string;
  instructions?: string;
  capabilities: AgentCapability[];
  
  // Safety & Constraints
  maxSteps?: number; // Maximum planning/execution steps
  maxToolCalls?: number; // Max tool calls per execution
  timeout?: number; // milliseconds
  allowedTools?: string[]; // Whitelist of tool names
  blockedTools?: string[]; // Blacklist of tool names
  safetyMode?: 'strict' | 'moderate' | 'permissive';
  
  // Memory
  useMemory?: boolean;
  memoryType?: 'short_term' | 'long_term' | 'both';
  memoryLimit?: number; // Max messages/entries to retain
  
  // Error Handling
  onError?: 'stop' | 'retry' | 'continue' | 'fallback';
  maxRetries?: number;
  fallbackModel?: AIModel;
  
  // Logging & Monitoring
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  trackMetrics?: boolean;
  streamOutput?: boolean;
  
  // Custom metadata
  metadata?: Record<string, any>;
}

// ============= Agent Session =============

export interface AgentSession {
  id: string;
  agentId: string;
  workflowId?: string;
  executionId?: string;
  userId?: string;
  organizationId?: string;
  
  // Session State
  status: 'active' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  
  // Context
  input: any;
  output?: any;
  context: Record<string, any>;
  
  // Memory
  messages: AIMessage[];
  shortTermMemory: MemoryEntry[];
  
  // Metrics
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  
  // Results
  toolCalls: ToolCallRecord[];
  steps: AgentStep[];
  error?: string;
  
  metadata?: Record<string, any>;
}

// ============= Agent Planning & Execution =============

export interface AgentPlan {
  goal: string;
  steps: AgentStep[];
  reasoning: string;
  estimatedDuration?: number;
  requiredTools: string[];
  risks?: string[];
}

export interface AgentStep {
  id: string;
  stepNumber: number;
  type: 'reasoning' | 'tool_call' | 'data_transform' | 'decision' | 'output';
  description: string;
  action?: string;
  
  // Tool-related
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  
  // Result
  result?: any;
  error?: string;
  reasoning?: string;
  
  metadata?: Record<string, any>;
}

export interface AgentThought {
  type: 'observation' | 'reasoning' | 'decision' | 'reflection';
  content: string;
  confidence?: number;
  timestamp: Date;
}

// ============= Tool System =============

export interface AgentTool {
  // Identity
  name: string;
  description: string;
  category: 'http' | 'database' | 'file' | 'ai_model' | 'workflow' | 'internal' | 'external' | 'custom';
  
  // Schema
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
  };
  
  // Configuration
  executor: ToolExecutor;
  requiresAuth?: boolean;
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
  
  // Metadata
  version?: string;
  tags?: string[];
  examples?: ToolExample[];
  metadata?: Record<string, any>;
}

export interface ToolExecutor {
  execute(input: any, context: ToolExecutionContext): Promise<ToolResult>;
}

export interface ToolExecutionContext {
  agentId: string;
  sessionId: string;
  workflowContext?: ExecutionContext;
  userId?: string;
  organizationId?: string;
  credentials?: Record<string, any>;
  environment?: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    tokensUsed?: number;
    cost?: number;
    cached?: boolean;
  };
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: any;
  output?: ToolResult;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface ToolExample {
  description: string;
  input: any;
  output: any;
}

// ============= Memory System =============

export interface MemoryEntry {
  id: string;
  type: 'conversation' | 'fact' | 'decision' | 'result' | 'context';
  content: string;
  embedding?: number[]; // For semantic search
  importance?: number; // 0-1 score
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentMemory {
  sessionId: string;
  agentId: string;
  
  // Short-term: Current session context
  shortTerm: MemoryEntry[];
  
  // Long-term: Persistent across sessions
  longTerm: MemoryEntry[];
  
  // Retrieval
  retrieve(query: string, limit?: number): Promise<MemoryEntry[]>;
  store(entry: MemoryEntry, type: 'short' | 'long'): Promise<void>;
  clear(type: 'short' | 'long' | 'all'): Promise<void>;
}

// ============= Agent Request & Response =============

export interface AgentRequest {
  // Input
  input: any;
  instructions?: string;
  
  // Context
  workflowContext?: ExecutionContext;
  previousNodeOutputs?: Record<string, any>;
  variables?: Record<string, any>;
  files?: Array<{
    name: string;
    url?: string;
    base64?: string;
    mimeType: string;
  }>;
  
  // Configuration Overrides
  config?: Partial<AgentConfig>;
  
  // Session
  sessionId?: string; // Resume existing session
  useMemory?: boolean;
  
  // Options
  streaming?: boolean;
  streamCallback?: (chunk: AgentStreamChunk) => void;
}

export interface AgentResponse {
  sessionId: string;
  status: 'success' | 'partial' | 'failed';
  
  // Output
  output: any;
  reasoning?: string;
  confidence?: number;
  
  // Execution Details
  steps: AgentStep[];
  toolCalls: ToolCallRecord[];
  plan?: AgentPlan;
  
  // Metrics
  duration: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  
  // Next Actions (for workflow routing)
  nextActions?: Array<{
    type: 'continue' | 'branch' | 'loop' | 'terminate';
    targetNodeId?: string;
    condition?: string;
    data?: any;
  }>;
  
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentStreamChunk {
  type: 'start' | 'thought' | 'tool_call' | 'tool_result' | 'step' | 'output' | 'end' | 'error';
  data: any;
  timestamp: Date;
}

// ============= Agent Execution Context =============

export interface AgentExecutionContext {
  session: AgentSession;
  config: AgentConfig;
  tools: Map<string, AgentTool>;
  memory: AgentMemory;
  
  // Workflow Integration
  workflowContext?: ExecutionContext;
  nodeData?: Map<string, any>;
  
  // State Management
  currentStep: number;
  thoughts: AgentThought[];
  
  // Callbacks
  onToolCall?: (toolName: string, input: any) => void;
  onStepComplete?: (step: AgentStep) => void;
  onThought?: (thought: AgentThought) => void;
  
  // Utilities
  log(level: string, message: string, data?: any): void;
  emit(event: string, data: any): void;
}

// ============= Agent Events =============

export type AgentEventType = 
  | 'agent.started'
  | 'agent.planning'
  | 'agent.step.started'
  | 'agent.step.completed'
  | 'agent.tool.call'
  | 'agent.tool.result'
  | 'agent.thought'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.timeout';

export interface AgentEvent {
  type: AgentEventType;
  sessionId: string;
  agentId: string;
  timestamp: Date;
  data: any;
}

// ============= Planning System =============

export interface PlanningRequest {
  goal: string;
  context: Record<string, any>;
  availableTools: string[];
  constraints?: {
    maxSteps?: number;
    timeout?: number;
    requiredOutputFormat?: string;
  };
}

export interface PlanningResult {
  plan: AgentPlan;
  reasoning: string;
  confidence: number;
  alternatives?: AgentPlan[];
}

// ============= Safety & Validation =============

export interface SafetyCheck {
  type: 'input' | 'output' | 'tool' | 'code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  blocked: boolean;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  safetyChecks?: SafetyCheck[];
}

// ============= Agent Error Types =============

export class AgentError extends Error {
  constructor(
    message: string,
    public code: AgentErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export enum AgentErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  MAX_STEPS_EXCEEDED = 'MAX_STEPS_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  SAFETY_VIOLATION = 'SAFETY_VIOLATION',
  MODEL_ERROR = 'MODEL_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  PLANNING_FAILED = 'PLANNING_FAILED',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNKNOWN = 'UNKNOWN',
}

// ============= Agent Metrics =============

export interface AgentMetrics {
  sessionId: string;
  agentId: string;
  
  // Performance
  totalDuration: number;
  avgStepDuration: number;
  toolCallDuration: number;
  thinkingDuration: number;
  
  // Resource Usage
  totalTokens: number;
  totalCost: number;
  toolCallCount: number;
  stepCount: number;
  
  // Success Metrics
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  
  // Tool Usage
  toolUsageBreakdown: Record<string, number>;
  
  timestamp: Date;
}

// ============= Model Selection =============

export interface ModelRecommendation {
  model: AIModel;
  provider: AIProvider;
  reasoning: string;
  confidence: number;
  estimatedCost: number;
  estimatedLatency: number;
}

export interface ModelSelectionCriteria {
  taskType: 'reasoning' | 'coding' | 'planning' | 'transformation' | 'analysis' | 'general';
  complexity: 'low' | 'medium' | 'high';
  prioritize: 'speed' | 'cost' | 'quality' | 'balanced';
  requiresVision?: boolean;
  requiresTools?: boolean;
  maxLatency?: number; // milliseconds
  maxCost?: number; // dollars
}
