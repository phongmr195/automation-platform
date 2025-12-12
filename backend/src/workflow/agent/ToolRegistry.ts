/**
 * Tool Registry
 * Manages registration and execution of agent tools
 */

import type { AgentTool, ToolExecutor, ToolExecutionContext, ToolResult } from './types';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { AIModelService } from '../ai/AIModelService';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private rateLimitTracking: Map<string, number[]> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  /**
   * Register a new tool
   */
  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get tool by name
   */
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools with optional filtering
   */
  getTools(allowedTools?: string[], blockedTools?: string[]): Map<string, AgentTool> {
    let filtered = new Map(this.tools);

    if (allowedTools && allowedTools.length > 0) {
      filtered = new Map(
        Array.from(filtered.entries()).filter(([name]) => allowedTools.includes(name))
      );
    }

    if (blockedTools && blockedTools.length > 0) {
      filtered = new Map(
        Array.from(filtered.entries()).filter(([name]) => !blockedTools.includes(name))
      );
    }

    return filtered;
  }

  /**
   * Check rate limit for tool
   */
  checkRateLimit(toolName: string, tool: AgentTool): boolean {
    if (!tool.rateLimit) return true;

    const now = Date.now();
    const calls = this.rateLimitTracking.get(toolName) || [];
    
    // Remove old calls outside the window
    const validCalls = calls.filter(time => now - time < tool.rateLimit!.windowMs);
    
    if (validCalls.length >= tool.rateLimit.maxCalls) {
      return false;
    }

    validCalls.push(now);
    this.rateLimitTracking.set(toolName, validCalls);
    return true;
  }

  /**
   * List all available tools with their descriptions
   */
  listTools(): Array<{ name: string; description: string; category: string }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
    }));
  }

  /**
   * Register all built-in tools
   */
  private registerBuiltInTools(): void {
    // HTTP Request Tool
    this.register({
      name: 'http_request',
      description: 'Make HTTP requests to external APIs (GET, POST, PUT, DELETE, PATCH)',
      category: 'http',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to request' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method' },
          headers: { type: 'object', description: 'Request headers' },
          body: { type: 'object', description: 'Request body (for POST, PUT, PATCH)' },
          timeout: { type: 'number', description: 'Request timeout in milliseconds' },
        },
        required: ['url'],
      },
      executor: new HTTPRequestTool(),
    });

    // Database Query Tool
    this.register({
      name: 'database_query',
      description: 'Execute SQL queries on the workflow database',
      category: 'database',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query to execute (SELECT only for safety)' },
          params: { type: 'array', description: 'Query parameters' },
        },
        required: ['query'],
      },
      executor: new DatabaseQueryTool(),
    });

    // Database Write Tool
    this.register({
      name: 'database_write',
      description: 'Insert or update data in the workflow database',
      category: 'database',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          operation: { type: 'string', enum: ['insert', 'update', 'upsert'], description: 'Operation type' },
          data: { type: 'object', description: 'Data to insert/update' },
          where: { type: 'object', description: 'WHERE conditions for update' },
        },
        required: ['table', 'operation', 'data'],
      },
      executor: new DatabaseWriteTool(),
    });

    // File Read Tool
    this.register({
      name: 'file_read',
      description: 'Read file contents from the workflow file system',
      category: 'file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace' },
          encoding: { type: 'string', enum: ['utf8', 'base64'], description: 'File encoding' },
        },
        required: ['path'],
      },
      executor: new FileReadTool(),
    });

    // File Write Tool
    this.register({
      name: 'file_write',
      description: 'Write data to a file in the workflow file system',
      category: 'file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace' },
          content: { type: 'string', description: 'File content to write' },
          encoding: { type: 'string', enum: ['utf8', 'base64'], description: 'File encoding' },
        },
        required: ['path', 'content'],
      },
      executor: new FileWriteTool(),
    });

    // AI Model Tool
    this.register({
      name: 'ai_generate',
      description: 'Generate text using AI models (Claude, GPT, Gemini)',
      category: 'ai_model',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text prompt for the AI model' },
          model: { type: 'string', description: 'AI model to use (claude-sonnet-4.5, gpt-4, etc.)' },
          temperature: { type: 'number', description: 'Creativity level (0-1)' },
          maxTokens: { type: 'number', description: 'Maximum tokens to generate' },
        },
        required: ['prompt'],
      },
      executor: new AIGenerateTool(),
    });

    // Workflow Context Tool
    this.register({
      name: 'get_workflow_data',
      description: 'Retrieve data from previous workflow nodes',
      category: 'workflow',
      inputSchema: {
        type: 'object',
        properties: {
          nodeId: { type: 'string', description: 'Node ID to get data from' },
          path: { type: 'string', description: 'JSON path to specific data (e.g., "data.result")' },
        },
        required: ['nodeId'],
      },
      executor: new WorkflowContextTool(),
    });

    // Set Workflow Variable Tool
    this.register({
      name: 'set_workflow_variable',
      description: 'Set a variable in the workflow context for use by subsequent nodes',
      category: 'workflow',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Variable name' },
          value: { description: 'Variable value (any type)' },
        },
        required: ['name', 'value'],
      },
      executor: new SetWorkflowVariableTool(),
    });

    // JSON Transform Tool
    this.register({
      name: 'json_transform',
      description: 'Transform JSON data using JSONPath or custom logic',
      category: 'internal',
      inputSchema: {
        type: 'object',
        properties: {
          data: { description: 'Input JSON data' },
          operations: {
            type: 'array',
            description: 'Array of transformation operations',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['select', 'filter', 'map', 'sort', 'group'] },
                path: { type: 'string', description: 'JSONPath expression' },
                transform: { type: 'string', description: 'Transformation function' },
              },
            },
          },
        },
        required: ['data', 'operations'],
      },
      executor: new JSONTransformTool(),
    });

    // Code Execution Tool (Sandboxed)
    this.register({
      name: 'execute_code',
      description: 'Execute JavaScript code in a sandboxed environment',
      category: 'internal',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript code to execute' },
          context: { type: 'object', description: 'Variables available to the code' },
          timeout: { type: 'number', description: 'Execution timeout in milliseconds' },
        },
        required: ['code'],
      },
      executor: new CodeExecutionTool(),
    });

    // Email Send Tool
    this.register({
      name: 'send_email',
      description: 'Send email via configured email service',
      category: 'external',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body (HTML or plain text)' },
          from: { type: 'string', description: 'Sender email address' },
        },
        required: ['to', 'subject', 'body'],
      },
      executor: new EmailSendTool(),
      rateLimit: {
        maxCalls: 10,
        windowMs: 60000, // 10 emails per minute
      },
    });
  }
}

// ============= Tool Implementations =============

class HTTPRequestTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { url, method = 'GET', headers = {}, body, timeout = 30000 } = input;

      const response = await axios({
        url,
        method,
        headers,
        data: body,
        timeout,
      });

      return {
        success: true,
        data: {
          status: response.status,
          headers: response.headers,
          body: response.data,
        },
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}

class DatabaseQueryTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { query, params = [] } = input;

      // Security: Only allow SELECT queries
      if (!query.trim().toLowerCase().startsWith('select')) {
        return {
          success: false,
          error: 'Only SELECT queries are allowed for safety. Use database_write for modifications.',
        };
      }

      const result = await prisma.$queryRawUnsafe(query, ...params);

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}

class DatabaseWriteTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { table, operation, data, where } = input;

      let result;
      switch (operation) {
        case 'insert':
          result = await (prisma as any)[table].create({ data });
          break;
        case 'update':
          result = await (prisma as any)[table].update({ where, data });
          break;
        case 'upsert':
          result = await (prisma as any)[table].upsert({
            where,
            create: data,
            update: data,
          });
          break;
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}

class FileReadTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { path: filePath, encoding = 'utf8' } = input;
      
      // Security: Prevent directory traversal
      const safePath = path.join(process.cwd(), 'workspace', filePath);
      if (!safePath.startsWith(path.join(process.cwd(), 'workspace'))) {
        return { success: false, error: 'Invalid file path: directory traversal detected' };
      }

      const content = await fs.readFile(safePath, encoding as BufferEncoding);

      return {
        success: true,
        data: { content, path: filePath },
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}

class FileWriteTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { path: filePath, content, encoding = 'utf8' } = input;
      
      // Security: Prevent directory traversal
      const safePath = path.join(process.cwd(), 'workspace', filePath);
      if (!safePath.startsWith(path.join(process.cwd(), 'workspace'))) {
        return { success: false, error: 'Invalid file path: directory traversal detected' };
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, content, encoding as BufferEncoding);

      return {
        success: true,
        data: { path: filePath, size: Buffer.byteLength(content) },
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}

class AIGenerateTool implements ToolExecutor {
  private aiService = new AIModelService();

  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { prompt, model = 'claude-sonnet-4.5', temperature = 0.7, maxTokens = 2048 } = input;

      const response = await this.aiService.execute({
        messages: [{ role: 'user', content: prompt }],
        config: {
          model,
          provider: this.getProvider(model),
          temperature,
          maxTokens,
        },
      });

      return {
        success: true,
        data: {
          content: response.content,
          usage: response.usage,
        },
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: response.usage.total_tokens,
          cost: response.estimatedCost,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  private getProvider(model: string): any {
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gpt')) return 'openai';
    if (model.includes('gemini')) return 'google';
    return 'anthropic';
  }
}

class WorkflowContextTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const { nodeId, path } = input;

      if (!context.workflowContext?.nodeData) {
        return { success: false, error: 'No workflow context available' };
      }

      const nodeData = context.workflowContext.nodeData.get(nodeId);
      if (!nodeData) {
        return { success: false, error: `Node ${nodeId} not found in workflow context` };
      }

      let data = nodeData;
      if (path) {
        const parts = path.split('.');
        for (const part of parts) {
          data = data?.[part];
        }
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

class SetWorkflowVariableTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const { name, value } = input;

      if (!context.workflowContext?.variables) {
        return { success: false, error: 'No workflow context available' };
      }

      context.workflowContext.variables[name] = value;

      return {
        success: true,
        data: { name, value },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

class JSONTransformTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const { data, operations } = input;
      let result = data;

      for (const op of operations) {
        switch (op.type) {
          case 'select':
            result = this.selectPath(result, op.path);
            break;
          case 'filter':
            result = Array.isArray(result) ? result.filter((item: any) => eval(op.transform)) : result;
            break;
          case 'map':
            result = Array.isArray(result) ? result.map((item: any) => eval(op.transform)) : result;
            break;
          case 'sort':
            result = Array.isArray(result) ? result.sort((a: any, b: any) => eval(op.transform)) : result;
            break;
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private selectPath(obj: any, path: string): any {
    const parts = path.split('.');
    let result = obj;
    for (const part of parts) {
      result = result?.[part];
    }
    return result;
  }
}

class CodeExecutionTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { code, context: execContext = {}, timeout = 5000 } = input;

      // Use Node's VM for sandboxed execution
      const { NodeVM } = require('vm2');
      const vm = new NodeVM({
        timeout,
        sandbox: execContext,
      });

      const result = vm.run(`module.exports = (function() { ${code} })()`, 'agent-code.js');

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}

class EmailSendTool implements ToolExecutor {
  async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const { to, subject, body, from = process.env.EMAIL_FROM } = input;

      // This is a placeholder - integrate with your email service (SendGrid, SES, etc.)
      console.log(`[Email] To: ${to}, Subject: ${subject}`);

      return {
        success: true,
        data: {
          messageId: `msg_${Date.now()}`,
          to,
          subject,
        },
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}
