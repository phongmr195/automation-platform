/**
 * Transform/JSON Node
 * Transform data using JavaScript expressions and JSON manipulation
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

export class TransformExecutor implements INodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { operation, code, mapping, path } = node.data.parameters;

      switch (operation) {
        case 'code':
          return await this.executeCode(code, context, startTime);
        
        case 'map':
          return await this.mapFields(mapping, context, startTime);
        
        case 'extract':
          return await this.extractPath(path, context, startTime);
        
        case 'format':
          return await this.formatString(node.data.parameters, context, startTime);
        
        default:
          throw new Error(`Unknown transform operation: ${operation}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Transform failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute JavaScript code to transform data
   */
  private async executeCode(
    code: string, 
    context: ExecutionContext, 
    startTime: number
  ): Promise<NodeExecutionResult> {
    try {
      // Create safe context with previous node data
      const nodeData: Record<string, any> = {};
      context.nodeData.forEach((value, key) => {
        nodeData[key] = value;
      });

      // Create function with context
      const func = new Function(
        'context',
        'nodeData', 
        'variables',
        `
        'use strict';
        ${code}
        `
      );

      const result = func(context, nodeData, context.variables);

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      throw new Error(`Code execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Map fields from input to output
   */
  private async mapFields(
    mapping: Record<string, string>,
    context: ExecutionContext,
    startTime: number
  ): Promise<NodeExecutionResult> {
    const output: Record<string, any> = {};

    for (const [targetField, sourcePath] of Object.entries(mapping)) {
      const value = this.getValueByPath(sourcePath, context);
      this.setValueByPath(output, targetField, value);
    }

    return {
      success: true,
      output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Extract data from specific path
   */
  private async extractPath(
    path: string,
    context: ExecutionContext,
    startTime: number
  ): Promise<NodeExecutionResult> {
    const value = this.getValueByPath(path, context);

    return {
      success: true,
      output: value,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Format string with template variables
   */
  private async formatString(
    params: any,
    context: ExecutionContext,
    startTime: number
  ): Promise<NodeExecutionResult> {
    const { template } = params;
    
    const formatted = this.replaceVariables(template, context);

    return {
      success: true,
      output: formatted,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get value by path (e.g., "node-1.data.results[0].name")
   */
  private getValueByPath(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    const nodeId = parts[0];
    
    let value = context.nodeData.get(nodeId);
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      // Handle array access: field[0]
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const fieldName = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        value = value?.[fieldName]?.[index];
      } else {
        value = value?.[part];
      }
      
      if (value === undefined) break;
    }
    
    return value;
  }

  /**
   * Set value by path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Replace variables in string
   */
  private replaceVariables(text: string, context: ExecutionContext): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getValueByPath(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }

  validate(node: WorkflowNode): boolean | string {
    const { operation } = node.data.parameters;
    
    if (!operation) {
      return 'Operation is required (code, map, extract, or format)';
    }

    if (operation === 'code' && !node.data.parameters.code) {
      return 'Code is required for code operation';
    }

    if (operation === 'map' && !node.data.parameters.mapping) {
      return 'Mapping is required for map operation';
    }

    if (operation === 'extract' && !node.data.parameters.path) {
      return 'Path is required for extract operation';
    }

    if (operation === 'format' && !node.data.parameters.template) {
      return 'Template is required for format operation';
    }
    
    return true;
  }
}
