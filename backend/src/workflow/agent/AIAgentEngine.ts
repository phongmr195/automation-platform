/**
 * AI Agent Core Engine
 * Autonomous agent with reasoning, planning, and tool execution
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AgentSession,
  AgentPlan,
  AgentStep,
  AgentTool,
  ToolCallRecord,
  AgentExecutionContext,
  AgentError,
  AgentErrorCode,
  AgentThought,
  ModelSelectionCriteria,
  ModelRecommendation,
} from './types';
import { AIModelService } from '../ai/AIModelService';
import type { AIMessage, AIContentBlock } from '../ai/types';
import { ToolRegistry } from './ToolRegistry';
import { AgentMemoryManager } from './AgentMemory';

export class AIAgentEngine {
  private modelService: AIModelService;
  private toolRegistry: ToolRegistry;
  private memoryManager: AgentMemoryManager;

  constructor() {
    this.modelService = new AIModelService();
    this.toolRegistry = new ToolRegistry();
    this.memoryManager = new AgentMemoryManager();
  }

  /**
   * Execute agent with full autonomous capabilities
   */
  async execute(request: AgentRequest, config: AgentConfig): Promise<AgentResponse> {
    const startTime = Date.now();
    const sessionId = request.sessionId || this.generateSessionId();

    // Initialize session
    const session: AgentSession = {
      id: sessionId,
      agentId: config.id,
      workflowId: request.workflowContext?.workflowId,
      executionId: request.workflowContext?.executionId,
      status: 'active',
      currentStep: 0,
      totalSteps: 0,
      input: request.input,
      context: {
        ...request.variables,
        previousOutputs: request.previousNodeOutputs,
      },
      messages: [],
      shortTermMemory: [],
      startedAt: new Date(),
      toolCalls: [],
      steps: [],
    };

    try {
      // Load memory if enabled
      if (config.useMemory && request.useMemory !== false) {
        await this.loadMemory(session, config);
      }

      // Create execution context
      const execContext: AgentExecutionContext = {
        session,
        config,
        tools: this.toolRegistry.getTools(config.allowedTools, config.blockedTools),
        memory: await this.memoryManager.getMemory(sessionId, config.id),
        workflowContext: request.workflowContext,
        nodeData: request.workflowContext?.nodeData,
        currentStep: 0,
        thoughts: [],
        log: (level, message, data) => this.log(session, level, message, data),
        emit: (event, data) => this.emit(session, event, data),
      };

      // Execute with streaming support
      if (request.streaming && request.streamCallback) {
        return await this.executeStreaming(request, execContext);
      }

      // Standard execution flow
      return await this.executeStandard(request, execContext);

    } catch (error: any) {
      session.status = 'failed';
      session.error = error.message;
      session.completedAt = new Date();
      session.duration = Date.now() - startTime;

      return {
        sessionId,
        status: 'failed',
        output: null,
        steps: session.steps,
        toolCalls: session.toolCalls,
        duration: session.duration,
        tokenUsage: session.tokenUsage || { input: 0, output: 0, total: 0 },
        cost: session.cost || 0,
        error: error.message,
      };
    }
  }

  /**
   * Standard execution flow with planning and multi-step reasoning
   */
  private async executeStandard(
    request: AgentRequest,
    context: AgentExecutionContext
  ): Promise<AgentResponse> {
    const { session, config } = context;

    // Step 1: Create execution plan
    this.emit(session, 'agent.planning', { goal: this.extractGoal(request) });
    const plan = await this.createPlan(request, context);
    session.totalSteps = plan.steps.length;

    // Step 2: Execute plan step by step
    for (const step of plan.steps) {
      if (session.currentStep >= (config.maxSteps || 50)) {
        throw new AgentError(
          `Maximum steps (${config.maxSteps}) exceeded`,
          'MAX_STEPS_EXCEEDED' as AgentErrorCode
        );
      }

      await this.executeStep(step, context);
      session.currentStep++;
      session.steps.push(step);
    }

    // Step 3: Generate final output
    const output = await this.generateOutput(context);

    // Step 4: Save memory
    if (config.useMemory) {
      await this.saveMemory(session, config);
    }

    // Complete session
    session.status = 'completed';
    session.output = output;
    session.completedAt = new Date();
    session.duration = session.completedAt.getTime() - session.startedAt.getTime();

    this.emit(session, 'agent.completed', { output, duration: session.duration });

    return {
      sessionId: session.id,
      status: 'success',
      output,
      reasoning: plan.reasoning,
      steps: session.steps,
      toolCalls: session.toolCalls,
      plan,
      duration: session.duration,
      tokenUsage: session.tokenUsage || { input: 0, output: 0, total: 0 },
      cost: session.cost || 0,
    };
  }

  /**
   * Streaming execution with real-time updates
   */
  private async executeStreaming(
    request: AgentRequest,
    context: AgentExecutionContext
  ): Promise<AgentResponse> {
    const callback = request.streamCallback!;
    
    callback({
      type: 'start',
      data: { sessionId: context.session.id },
      timestamp: new Date(),
    });

    // Override context callbacks for streaming
    context.onThought = (thought) => {
      callback({
        type: 'thought',
        data: thought,
        timestamp: new Date(),
      });
    };

    context.onToolCall = (toolName, input) => {
      callback({
        type: 'tool_call',
        data: { toolName, input },
        timestamp: new Date(),
      });
    };

    context.onStepComplete = (step) => {
      callback({
        type: 'step',
        data: step,
        timestamp: new Date(),
      });
    };

    // Execute standard flow
    const response = await this.executeStandard(request, context);

    callback({
      type: 'end',
      data: response,
      timestamp: new Date(),
    });

    return response;
  }

  /**
   * Create execution plan using AI reasoning
   */
  private async createPlan(
    request: AgentRequest,
    context: AgentExecutionContext
  ): Promise<AgentPlan> {
    const { config } = context;
    const goal = this.extractGoal(request);
    const availableTools = Array.from(context.tools.keys());

    // Build planning prompt
    const planningPrompt = this.buildPlanningPrompt(goal, request, availableTools, config);

    // Use powerful model for planning (Opus or Sonnet 4.5)
    const planningModel = this.selectPlanningModel(config);

    const aiResponse = await this.modelService.execute({
      messages: [{
        role: 'user',
        content: planningPrompt,
      }],
      config: {
        provider: planningModel.provider,
        model: planningModel.model,
        temperature: 0.3, // Lower for more deterministic planning
        maxTokens: 4096,
      },
    });

    // Parse plan from AI response
    const plan = this.parsePlan(aiResponse.content, availableTools);
    
    context.session.messages.push({
      role: 'assistant',
      content: aiResponse.content,
    });

    return plan;
  }

  /**
   * Execute individual step
   */
  private async executeStep(step: AgentStep, context: AgentExecutionContext): Promise<void> {
    step.status = 'running';
    step.startedAt = new Date();

    this.emit(context.session, 'agent.step.started', { step });

    try {
      switch (step.type) {
        case 'reasoning':
          await this.executeReasoningStep(step, context);
          break;
        case 'tool_call':
          await this.executeToolStep(step, context);
          break;
        case 'data_transform':
          await this.executeTransformStep(step, context);
          break;
        case 'decision':
          await this.executeDecisionStep(step, context);
          break;
        case 'output':
          await this.executeOutputStep(step, context);
          break;
      }

      step.status = 'completed';
      step.completedAt = new Date();
      step.duration = step.completedAt.getTime() - step.startedAt.getTime();

      context.onStepComplete?.(step);
      this.emit(context.session, 'agent.step.completed', { step });

    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      step.duration = step.completedAt.getTime() - step.startedAt.getTime();

      if (context.config.onError === 'stop') {
        throw error;
      } else if (context.config.onError === 'continue') {
        step.status = 'skipped';
      }
    }
  }

  /**
   * Execute reasoning step
   */
  private async executeReasoningStep(step: AgentStep, context: AgentExecutionContext): Promise<void> {
    const prompt = this.buildReasoningPrompt(step, context);

    const response = await this.modelService.execute({
      messages: [{
        role: 'user',
        content: prompt,
      }],
      config: {
        provider: context.config.provider,
        model: context.config.model,
        temperature: context.config.temperature || 0.7,
        maxTokens: 2048,
      },
    });

    step.reasoning = response.content;
    step.result = this.extractReasoningResult(response.content);

    // Track thought
    const thought: AgentThought = {
      type: 'reasoning',
      content: response.content,
      confidence: 0.8,
      timestamp: new Date(),
    };
    context.thoughts.push(thought);
    context.onThought?.(thought);

    // Update token usage
    this.updateTokenUsage(context.session, response.usage);
  }

  /**
   * Execute tool call step
   */
  private async executeToolStep(step: AgentStep, context: AgentExecutionContext): Promise<void> {
    const tool = context.tools.get(step.toolName!);
    if (!tool) {
      throw new AgentError(
        `Tool "${step.toolName}" not found`,
        'TOOL_NOT_FOUND' as AgentErrorCode
      );
    }

    // Emit tool call event
    context.onToolCall?.(step.toolName!, step.toolInput);
    this.emit(context.session, 'agent.tool.call', {
      toolName: step.toolName,
      input: step.toolInput,
    });

    // Execute tool
    const toolResult = await tool.executor.execute(step.toolInput!, {
      agentId: context.config.id,
      sessionId: context.session.id,
      workflowContext: context.workflowContext,
      userId: context.session.userId,
      organizationId: context.session.organizationId,
    });

    step.toolOutput = toolResult.data;
    step.result = toolResult;

    // Record tool call
    const toolCall: ToolCallRecord = {
      id: this.generateId(),
      toolName: step.toolName!,
      input: step.toolInput!,
      output: toolResult,
      startedAt: step.startedAt!,
      completedAt: new Date(),
      duration: Date.now() - step.startedAt!.getTime(),
      status: toolResult.success ? 'completed' : 'failed',
      error: toolResult.error,
    };
    context.session.toolCalls.push(toolCall);

    // Emit result
    this.emit(context.session, 'agent.tool.result', {
      toolName: step.toolName,
      result: toolResult,
    });

    if (!toolResult.success) {
      throw new AgentError(
        `Tool execution failed: ${toolResult.error}`,
        'TOOL_EXECUTION_FAILED' as AgentErrorCode,
        toolResult
      );
    }
  }

  /**
   * Execute data transformation step
   */
  private async executeTransformStep(step: AgentStep, context: AgentExecutionContext): Promise<void> {
    const transformPrompt = `Transform the following data: ${JSON.stringify(step.toolInput)}
    
Required transformation: ${step.description}

Return the transformed data in JSON format.`;

    const response = await this.modelService.execute({
      messages: [{
        role: 'user',
        content: transformPrompt,
      }],
      config: {
        provider: context.config.provider,
        model: context.config.model,
        temperature: 0.3,
        maxTokens: 2048,
      },
    });

    step.result = this.extractJSONFromResponse(response.content);
    this.updateTokenUsage(context.session, response.usage);
  }

  /**
   * Execute decision step
   */
  private async executeDecisionStep(step: AgentStep, context: AgentExecutionContext): Promise<void> {
    const decisionPrompt = `Make a decision based on the following context:
${JSON.stringify(context.session.context, null, 2)}

Decision required: ${step.description}

Respond with:
1. Your decision (yes/no or specific choice)
2. Reasoning for the decision
3. Confidence level (0-1)

Format as JSON: { "decision": "...", "reasoning": "...", "confidence": 0.0 }`;

    const response = await this.modelService.execute({
      messages: [{
        role: 'user',
        content: decisionPrompt,
      }],
      config: {
        provider: context.config.provider,
        model: context.config.model,
        temperature: 0.2,
        maxTokens: 1024,
      },
    });

    step.result = this.extractJSONFromResponse(response.content);
    step.reasoning = step.result?.reasoning;
    this.updateTokenUsage(context.session, response.usage);
  }

  /**
   * Execute output step
   */
  private async executeOutputStep(step: AgentStep, context: AgentExecutionContext): Promise<void> {
    // Collect all previous results
    const allResults = context.session.steps.map(s => ({
      type: s.type,
      description: s.description,
      result: s.result,
    }));

    const outputPrompt = `Generate the final output based on these results:
${JSON.stringify(allResults, null, 2)}

Original goal: ${this.extractGoal({ input: context.session.input } as AgentRequest)}

Instructions: ${step.description}

Generate a comprehensive, well-structured output.`;

    const response = await this.modelService.execute({
      messages: [{
        role: 'user',
        content: outputPrompt,
      }],
      config: {
        provider: context.config.provider,
        model: context.config.model,
        temperature: 0.7,
        maxTokens: 4096,
      },
    });

    step.result = response.content;
    this.updateTokenUsage(context.session, response.usage);
  }

  /**
   * Generate final output
   */
  private async generateOutput(context: AgentExecutionContext): Promise<any> {
    const lastStep = context.session.steps[context.session.steps.length - 1];
    
    if (lastStep?.type === 'output') {
      return lastStep.result;
    }

    // Synthesize output from all steps
    const results = context.session.steps
      .filter(s => s.status === 'completed')
      .map(s => s.result);

    return {
      summary: 'Agent execution completed',
      steps: context.session.steps.length,
      results,
      toolCalls: context.session.toolCalls.length,
    };
  }

  // ============= Helper Methods =============

  private buildPlanningPrompt(
    goal: string,
    request: AgentRequest,
    availableTools: string[],
    config: AgentConfig
  ): string {
    return `You are an AI Agent Planner. Create a step-by-step execution plan to achieve the following goal.

GOAL: ${goal}

CONTEXT:
${JSON.stringify(request.variables || {}, null, 2)}

AVAILABLE TOOLS:
${availableTools.join(', ')}

CONSTRAINTS:
- Maximum steps: ${config.maxSteps || 50}
- Safety mode: ${config.safetyMode || 'moderate'}
- Timeout: ${config.timeout || 30000}ms

INSTRUCTIONS:
${config.instructions || 'Follow best practices for efficient and safe execution.'}

Create a detailed plan with these step types:
1. reasoning - Analyze and think through the problem
2. tool_call - Execute a specific tool
3. data_transform - Transform or process data
4. decision - Make a decision based on context
5. output - Generate final output

Return your plan in this JSON format:
{
  "goal": "...",
  "reasoning": "Why this plan will work",
  "steps": [
    {
      "stepNumber": 1,
      "type": "reasoning",
      "description": "What this step does",
      "toolName": "tool-name (if type is tool_call)",
      "toolInput": {} (if type is tool_call)
    }
  ],
  "estimatedDuration": 5000,
  "requiredTools": ["tool1", "tool2"],
  "risks": ["potential issue 1"]
}`;
  }

  private buildReasoningPrompt(step: AgentStep, context: AgentExecutionContext): string {
    return `${context.config.systemPrompt}

CURRENT TASK: ${step.description}

CONTEXT:
${JSON.stringify(context.session.context, null, 2)}

PREVIOUS STEPS:
${context.session.steps.map(s => `- ${s.type}: ${s.description} → ${s.status}`).join('\n')}

Think through this step carefully and provide your reasoning.`;
  }

  private parsePlan(aiResponse: string, availableTools: string[]): AgentPlan {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: Create simple plan
      return {
        goal: 'Execute task',
        steps: [{
          id: this.generateId(),
          stepNumber: 1,
          type: 'reasoning',
          description: 'Analyze and execute',
          status: 'pending',
        }],
        reasoning: 'Simple execution plan',
        requiredTools: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      goal: parsed.goal,
      steps: parsed.steps.map((s: any, idx: number) => ({
        id: this.generateId(),
        stepNumber: idx + 1,
        type: s.type,
        description: s.description,
        toolName: s.toolName,
        toolInput: s.toolInput,
        status: 'pending',
      })),
      reasoning: parsed.reasoning,
      estimatedDuration: parsed.estimatedDuration,
      requiredTools: parsed.requiredTools || [],
      risks: parsed.risks,
    };
  }

  private extractGoal(request: AgentRequest): string {
    if (typeof request.input === 'string') {
      return request.input;
    }
    if (request.input?.goal) {
      return request.input.goal;
    }
    if (request.instructions) {
      return request.instructions;
    }
    return 'Process the provided input';
  }

  private extractReasoningResult(content: string): any {
    // Try to extract structured data or return raw content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { analysis: content };
      }
    }
    return { analysis: content };
  }

  private extractJSONFromResponse(content: string): any {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        return { raw: content };
      }
    }
    return { raw: content };
  }

  private selectPlanningModel(config: AgentConfig): { provider: string; model: string } {
    // Use more powerful model for planning
    if (config.model.includes('opus')) {
      return { provider: config.provider, model: config.model };
    }
    return { provider: 'anthropic', model: 'claude-opus-4.5' };
  }

  private updateTokenUsage(session: AgentSession, usage: any): void {
    if (!session.tokenUsage) {
      session.tokenUsage = { input: 0, output: 0, total: 0 };
    }
    session.tokenUsage.input += usage?.input_tokens || 0;
    session.tokenUsage.output += usage?.output_tokens || 0;
    session.tokenUsage.total += (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
  }

  private async loadMemory(session: AgentSession, config: AgentConfig): Promise<void> {
    // Load memory from memory manager
    const memory = await this.memoryManager.getMemory(session.id, config.id);
    const entries = await memory.retrieve('', config.memoryLimit || 10);
    session.shortTermMemory = entries;
  }

  private async saveMemory(session: AgentSession, config: AgentConfig): Promise<void> {
    const memory = await this.memoryManager.getMemory(session.id, config.id);
    
    // Save conversation
    await memory.store({
      id: this.generateId(),
      type: 'conversation',
      content: JSON.stringify(session.messages),
      timestamp: new Date(),
    }, 'short');

    // Save important results
    for (const step of session.steps) {
      if (step.status === 'completed' && step.result) {
        await memory.store({
          id: this.generateId(),
          type: 'result',
          content: JSON.stringify(step.result),
          importance: 0.7,
          timestamp: new Date(),
        }, config.memoryType === 'long_term' ? 'long' : 'short');
      }
    }
  }

  private log(session: AgentSession, level: string, message: string, data?: any): void {
    console.log(`[Agent ${session.agentId}] [${level.toUpperCase()}] ${message}`, data || '');
  }

  private emit(session: AgentSession, event: string, data: any): void {
    // Emit to event system (can integrate with WebSocket, EventEmitter, etc.)
    console.log(`[Agent Event] ${event}`, { sessionId: session.id, ...data });
  }

  private generateSessionId(): string {
    return `agent_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
