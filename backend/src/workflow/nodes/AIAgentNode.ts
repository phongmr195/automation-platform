/**
 * AI Agent Workflow Node
 * Autonomous AI agent that can reason, plan, and execute tasks within workflows
 */

import type {
  INodeExecutor,
  NodeExecutionResult,
  WorkflowNode,
  ExecutionContext,
} from '../types';
import { AIAgentEngine } from '../agent/AIAgentEngine';
import type { AgentConfig, AgentRequest, AgentResponse } from '../agent/types';

export class AIAgentExecutor implements INodeExecutor {
  private engine: AIAgentEngine;

  constructor() {
    this.engine = new AIAgentEngine();
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // Extract configuration
      const config = this.buildAgentConfig(node);
      const request = this.buildAgentRequest(node, context);

      // Execute agent
      const response: AgentResponse = await this.engine.execute(request, config);

      // Format output
      const output = this.formatOutput(response, node);

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const params = node.data.parameters;

    // Required fields
    if (!params.instructions && !params.input) {
      return 'Agent requires either instructions or input';
    }

    if (!params.model) {
      return 'AI model must be specified';
    }

    // Validate model
    const validModels = [
      'claude-sonnet-4.5',
      'claude-opus-4.5',
      'claude-sonnet-3.5',
      'gpt-4.5-turbo',
      'gpt-4',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
    ];

    if (!validModels.includes(params.model)) {
      return `Invalid model. Must be one of: ${validModels.join(', ')}`;
    }

    // Validate tool permissions if specified
    if (params.allowedTools && !Array.isArray(params.allowedTools)) {
      return 'allowedTools must be an array';
    }

    return true;
  }

  /**
   * Build agent configuration from node parameters
   */
  private buildAgentConfig(node: WorkflowNode): AgentConfig {
    const params = node.data.parameters;

    return {
      id: node.id,
      name: node.name || 'AI Agent',
      role: params.role || 'assistant',
      description: params.description,

      // Model
      model: params.model || 'claude-sonnet-4.5',
      provider: this.getProvider(params.model),
      temperature: params.temperature ?? 0.7,
      maxTokens: params.maxTokens || 4096,

      // Behavior
      systemPrompt: params.systemPrompt || this.getDefaultSystemPrompt(params.role),
      instructions: params.instructions,
      capabilities: params.capabilities || [
        'reasoning',
        'planning',
        'tool_calling',
        'data_transformation',
      ],

      // Safety
      maxSteps: params.maxSteps || 20,
      maxToolCalls: params.maxToolCalls || 30,
      timeout: params.timeout || 60000,
      allowedTools: params.allowedTools,
      blockedTools: params.blockedTools,
      safetyMode: params.safetyMode || 'moderate',

      // Memory
      useMemory: params.useMemory ?? false,
      memoryType: params.memoryType || 'short_term',
      memoryLimit: params.memoryLimit || 10,

      // Error Handling
      onError: params.onError || 'stop',
      maxRetries: params.maxRetries || 3,
      fallbackModel: params.fallbackModel,

      // Logging
      logLevel: params.logLevel || 'info',
      trackMetrics: params.trackMetrics ?? true,
      streamOutput: params.streamOutput ?? false,

      metadata: params.metadata,
    };
  }

  /**
   * Build agent request from node and context
   */
  private buildAgentRequest(node: WorkflowNode, context: ExecutionContext): AgentRequest {
    const params = node.data.parameters;

    // Collect input from various sources
    let input: any;

    if (params.input) {
      input = this.interpolateValue(params.input, context);
    } else if (params.inputFrom) {
      // Get input from specific node
      const sourceNodeId = params.inputFrom;
      input = context.nodeData.get(sourceNodeId);
    } else {
      // Use previous node output
      const nodeIds = Array.from(context.nodeData.keys());
      const lastNodeId = nodeIds[nodeIds.length - 1];
      input = context.nodeData.get(lastNodeId);
    }

    // Collect previous node outputs
    const previousNodeOutputs: Record<string, any> = {};
    context.nodeData.forEach((value, key) => {
      previousNodeOutputs[key] = value;
    });

    return {
      input,
      instructions: params.instructions,
      workflowContext: context,
      previousNodeOutputs,
      variables: context.variables,
      sessionId: params.sessionId,
      useMemory: params.useMemory,
      streaming: params.streamOutput,
    };
  }

  /**
   * Format agent response as node output
   */
  private formatOutput(response: AgentResponse, node: WorkflowNode): any {
    const params = node.data.parameters;
    const outputFormat = params.outputFormat || 'full';

    switch (outputFormat) {
      case 'result_only':
        return response.output;

      case 'simple':
        return {
          output: response.output,
          steps: response.steps.length,
          toolCalls: response.toolCalls.length,
          duration: response.duration,
          cost: response.cost,
        };

      case 'full':
      default:
        return {
          output: response.output,
          reasoning: response.reasoning,
          confidence: response.confidence,
          steps: response.steps.map(step => ({
            type: step.type,
            description: step.description,
            status: step.status,
            result: step.result,
            duration: step.duration,
          })),
          toolCalls: response.toolCalls.map(call => ({
            toolName: call.toolName,
            input: call.input,
            output: call.output?.data,
            duration: call.duration,
            status: call.status,
          })),
          metrics: {
            duration: response.duration,
            tokenUsage: response.tokenUsage,
            cost: response.cost,
          },
          nextActions: response.nextActions,
          sessionId: response.sessionId,
        };
    }
  }

  /**
   * Get AI provider from model name
   */
  private getProvider(model: string): any {
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gpt')) return 'openai';
    if (model.includes('gemini')) return 'google';
    return 'anthropic';
  }

  /**
   * Get default system prompt based on role
   */
  private getDefaultSystemPrompt(role: string): string {
    const prompts: Record<string, string> = {
      assistant: `You are a helpful AI assistant integrated into a workflow automation platform. 
Your goal is to help users accomplish their tasks efficiently and accurately.
You can use tools, reason through problems, and provide clear, actionable outputs.`,

      orchestrator: `You are an AI workflow orchestrator. Your job is to coordinate multiple tasks,
call appropriate tools, and ensure smooth execution of complex workflows.
Plan carefully, handle errors gracefully, and optimize for efficiency.`,

      specialist: `You are a specialized AI agent with deep expertise in your domain.
Provide detailed, accurate analysis and recommendations based on the input data.
Use your tools and reasoning capabilities to deliver high-quality results.`,

      analyst: `You are a data analyst AI agent. Your role is to analyze data, identify patterns,
generate insights, and provide data-driven recommendations.
Be thorough, precise, and back your conclusions with evidence.`,

      custom: `You are an AI agent in a workflow automation system.
Execute your tasks according to the provided instructions and context.`,
    };

    return prompts[role] || prompts.custom;
  }

  /**
   * Interpolate template strings with context data
   */
  private interpolateValue(value: any, context: ExecutionContext): any {
    if (typeof value === 'string') {
      return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const trimmedPath = path.trim();

        // Handle nodes.nodeId.field
        if (trimmedPath.startsWith('nodes.')) {
          const parts = trimmedPath.substring(6).split('.');
          const nodeId = parts[0];
          const nodeData = context.nodeData.get(nodeId);
          
          let result = nodeData;
          for (let i = 1; i < parts.length; i++) {
            result = result?.[parts[i]];
          }
          return result !== undefined ? result : match;
        }

        // Handle variables.varName
        if (trimmedPath.startsWith('variables.')) {
          const varName = trimmedPath.substring(10);
          return context.variables[varName] !== undefined
            ? context.variables[varName]
            : match;
        }

        return match;
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => this.interpolateValue(item, context));
    }

    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.interpolateValue(val, context);
      }
      return result;
    }

    return value;
  }
}
