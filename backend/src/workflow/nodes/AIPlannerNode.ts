/**
 * AI Planner Node
 * Agent-like planning and multi-step reasoning with tool use
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { AIModelService } from '../ai/AIModelService';
import { AIPlannerParams, AINodeConfig, AIMessage, AITool } from '../ai/types';

export class AIPlannerExecutor implements INodeExecutor {
  validate(node: WorkflowNode): boolean | string {
      throw new Error('Method not implemented.');
  }
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const params = node.data.parameters as AIPlannerParams;
      
      // Validate required parameters
      if (!params.goal) {
        throw new Error('Goal is required');
      }

      const maxSteps = params.maxSteps || 10;
      const plan: Array<{
        step: number;
        action: string;
        tool?: string;
        params?: any;
        reasoning: string;
      }> = [];

      // Build config - use Opus for complex planning
      const config: AINodeConfig = {
        provider: params.config?.provider || 'anthropic',
        model: params.config?.model || 'claude-opus-4.5', // Use Opus for deep reasoning
        temperature: params.config?.temperature ?? 0.7,
        maxTokens: params.config?.maxTokens ?? 8192,
        caching: params.config?.caching ?? true,
        ...params.config,
      };

      // Build planning prompt
      const prompt = this.buildPlanningPrompt(params);

      // Execute planning phase
      const planningResponse = await AIModelService.execute({
        messages: [{ role: 'user', content: prompt }],
        config,
        systemPrompt: 'You are an AI planning assistant. Break down complex goals into step-by-step plans.',
        tools: params.availableTools,
      });

      // Parse plan from response
      const parsedPlan = this.parsePlan(planningResponse.content);
      plan.push(...parsedPlan);

      // Execute plan steps if tools are available
      let finalOutput: any = null;
      const conversationHistory: AIMessage[] = [
        { role: 'user', content: prompt },
        { role: 'assistant', content: planningResponse.content },
      ];

      if (params.availableTools && params.availableTools.length > 0) {
        for (let i = 0; i < Math.min(plan.length, maxSteps); i++) {
          const step = plan[i];
          
          if (planningResponse.toolCalls) {
            // Execute tool calls
            const toolResults = await this.executeToolCalls(
              planningResponse.toolCalls,
              params.availableTools,
              context
            );

            // Add tool results to conversation
            conversationHistory.push({
              role: 'user',
              content: toolResults.map(r => ({
                type: 'tool_result' as const,
                tool_use_id: r.id,
                content: r.result,
              })),
            });

            // Get next action from AI
            const nextResponse = await AIModelService.execute({
              messages: conversationHistory,
              config,
              systemPrompt: 'Continue executing the plan. Use tools as needed.',
              tools: params.availableTools,
            });

            conversationHistory.push({
              role: 'assistant',
              content: nextResponse.content,
            });

            // Check if goal is achieved
            if (nextResponse.stopReason === 'end_turn') {
              finalOutput = nextResponse.content;
              break;
            }
          }
        }
      }

      const totalUsage = {
        inputTokens: planningResponse.usage.inputTokens,
        outputTokens: planningResponse.usage.outputTokens,
        totalTokens: planningResponse.usage.totalTokens,
        estimatedCost: planningResponse.usage.estimatedCost,
      };

      console.log(`[AI Planner] Model: ${planningResponse.model}, Steps: ${plan.length}, Tokens: ${totalUsage.totalTokens}, Cost: $${totalUsage.estimatedCost?.toFixed(4)}`);

      return {
        success: true,
        output: {
          plan,
          finalOutput,
          usage: totalUsage,
          steps: plan.length,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI Planner failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private buildPlanningPrompt(params: AIPlannerParams): string {
    let prompt = `Create a step-by-step plan to achieve the following goal:\n\n`;
    prompt += `Goal: ${params.goal}\n\n`;
    
    if (params.context && Object.keys(params.context).length > 0) {
      prompt += `Context:\n${JSON.stringify(params.context, null, 2)}\n\n`;
    }
    
    if (params.availableTools && params.availableTools.length > 0) {
      prompt += `Available tools:\n`;
      for (const tool of params.availableTools) {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      }
      prompt += `\n`;
    }
    
    prompt += `Break down the goal into clear, actionable steps. For each step, explain the reasoning.`;
    
    return prompt;
  }

  private parsePlan(content: string): Array<{
    step: number;
    action: string;
    tool?: string;
    params?: any;
    reasoning: string;
  }> {
    const plan: Array<any> = [];
    
    // Try to extract numbered steps
    const stepRegex = /(?:Step |^)(\d+)[:.]?\s*(.+?)(?=(?:Step \d+|Reasoning:|$))/gis;
    const matches = [...content.matchAll(stepRegex)];
    
    for (const match of matches) {
      const stepNum = parseInt(match[1]);
      const action = match[2].trim();
      
      // Extract reasoning if present
      const reasoningMatch = content.match(new RegExp(`Step ${stepNum}[\\s\\S]*?Reasoning:?\\s*(.+?)(?=(?:Step \\d+|$))`, 'i'));
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';
      
      plan.push({
        step: stepNum,
        action,
        reasoning,
      });
    }
    
    // If no steps found, create a single step
    if (plan.length === 0) {
      plan.push({
        step: 1,
        action: content.trim(),
        reasoning: 'Single-step plan',
      });
    }
    
    return plan;
  }

  private async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; input: any }>,
    availableTools: AITool[],
    context: ExecutionContext
  ): Promise<Array<{ id: string; result: any }>> {
    const results: Array<{ id: string; result: any }> = [];
    
    for (const call of toolCalls) {
      try {
        // In a real implementation, this would execute the actual tool
        // For now, we'll simulate tool execution
        const result = await this.simulateToolExecution(call.name, call.input, context);
        results.push({ id: call.id, result });
      } catch (error) {
        results.push({
          id: call.id,
          result: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }
    
    return results;
  }

  private async simulateToolExecution(
    toolName: string,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    // Placeholder for actual tool execution
    // In production, this would call the actual tool implementation
    return {
      tool: toolName,
      input,
      output: `Simulated execution of ${toolName}`,
      timestamp: new Date().toISOString(),
    };
  }
}
