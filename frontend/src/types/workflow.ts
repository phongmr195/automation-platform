/**
 * Workflow types matching backend
 */

export type NodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'transform';

export interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    service: string;
    operation: string;
    parameters: Record<string, unknown>;
  };
}

export interface NodeConnection {
  id: string;
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
  label?: string;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'manual';
  config: {
    cron?: string;
    path?: string;
    timezone?: string;
  };
}

export interface WorkflowSettings {
  timezone?: string;
  timeout?: number;
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NodeDefinition {
  type: string;
  category: 'trigger' | 'action' | 'logic' | 'transform';
  name: string;
  description: string;
  inputs?: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
  outputs?: {
    name: string;
    type: string;
    description?: string;
  }[];
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'cancelled';
  startedAt: Date | string;
  finishedAt?: Date | string;
  duration?: number;
  nodeResults?: Record<string, unknown>;
  error?: string;
}
