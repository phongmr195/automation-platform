/**
 * Workflow Engine Types
 * Core type definitions for the workflow system
 */

export type NodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'transform';

export interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    service: string; // 'lottery', 'football', 'telegram', 'http', etc.
    operation: string; // 'predict', 'fetch', 'send', etc.
    parameters: Record<string, any>;
  };
}

export interface NodeConnection {
  id: string;
  source: string; // source node id
  target: string; // target node id
  sourceOutput?: string; // for nodes with multiple outputs
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'manual';
  config: {
    cron?: string; // for schedule triggers
    path?: string; // for webhook triggers
    timezone?: string;
  };
}

export interface WorkflowSettings {
  timezone?: string;
  timeout?: number; // ms
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number; // ms
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  folderId?: string;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  trigger: {
    type: string;
    data?: any;
  };
  nodeData: Map<string, any>; // Store output from each node
  variables: Record<string, any>; // Global variables
  startedAt: Date;
  metadata?: Record<string, any>;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number; // ms
}

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'cancelled';
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  nodeResults: Map<string, NodeExecutionResult>;
  error?: string;
}

/**
 * Node Executor Interface
 * Each node type must implement this interface
 */
export interface INodeExecutor {
  /**
   * Execute the node logic
   * @param node - The workflow node to execute
   * @param context - Current execution context with data from previous nodes
   * @returns The result of node execution
   */
  execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  
  /**
   * Validate node configuration
   * @param node - The workflow node to validate
   * @returns true if valid, error message if invalid
   */
  validate(node: WorkflowNode): boolean | string;
}

/**
 * Node Definition for Registry
 */
export interface NodeDefinition {
  type: string; // unique identifier
  category: 'trigger' | 'action' | 'logic' | 'transform' | 'communication' | 'storage' | 'database' | 'productivity';
  name: string;
  description: string;
  executor: INodeExecutor;
  inputs?: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    default?: any; // Default value for the input
    placeholder?: string | any; // Placeholder text for UI (can be object for complex types)
    options?: string[]; // Dropdown options for select inputs
  }[];
  outputs?: {
    name: string;
    type: string;
    description?: string;
  }[];
}

/**
 * Node Execution Context Interface
 * Provides access to workflow data and utilities during node execution
 */
export interface NodeExecutionContext {
  workflowId: string;
  executionId: string;
  nodeData: Map<string, any>;
  variables: Record<string, any>;
  
  /**
   * Interpolate template strings like {{nodes.nodeId.field}}
   */
  interpolate(template: string): string;
  
  /**
   * Log execution messages
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void;
  
  /**
   * Get credential by ID (with decryption)
   */
  getCredential(credentialId: string): Promise<{ id: string; type: string; data: any } | null>;
}
