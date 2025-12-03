/**
 * Loop Node
 * Iterate over arrays and execute operations
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

export class LoopExecutor implements INodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { 
        operation = 'forEach',
        items,
        itemsPath,
        mapExpression,
        filterExpression,
        reduceExpression,
        initialValue,
        limit,
      } = node.data.parameters;

      // Get items to iterate
      let itemsArray = items;
      if (itemsPath) {
        itemsArray = this.getValueByPath(itemsPath, context);
      }

      if (!Array.isArray(itemsArray)) {
        throw new Error('Items must be an array');
      }

      // Apply limit if specified
      if (limit && limit > 0) {
        itemsArray = itemsArray.slice(0, limit);
      }

      let result: any;

      switch (operation) {
        case 'forEach':
          result = await this.forEach(itemsArray, context);
          break;
        
        case 'map':
          result = await this.map(itemsArray, mapExpression, context);
          break;
        
        case 'filter':
          result = await this.filter(itemsArray, filterExpression, context);
          break;
        
        case 'reduce':
          result = await this.reduce(itemsArray, reduceExpression, initialValue, context);
          break;
        
        case 'find':
          result = await this.find(itemsArray, filterExpression, context);
          break;
        
        case 'some':
          result = await this.some(itemsArray, filterExpression, context);
          break;
        
        case 'every':
          result = await this.every(itemsArray, filterExpression, context);
          break;
        
        default:
          throw new Error(`Unknown loop operation: ${operation}`);
      }

      return {
        success: true,
        output: {
          operation,
          itemCount: itemsArray.length,
          result,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Loop failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * For each - just iterate and return items
   */
  private async forEach(items: any[], context: ExecutionContext): Promise<any[]> {
    return items;
  }

  /**
   * Map - transform each item
   */
  private async map(items: any[], expression: string, context: ExecutionContext): Promise<any[]> {
    if (!expression) {
      throw new Error('Map expression is required');
    }

    return items.map((item, index) => {
      return this.evaluateExpression(expression, item, index, context);
    });
  }

  /**
   * Filter - keep items matching condition
   */
  private async filter(items: any[], expression: string, context: ExecutionContext): Promise<any[]> {
    if (!expression) {
      throw new Error('Filter expression is required');
    }

    return items.filter((item, index) => {
      const result = this.evaluateExpression(expression, item, index, context);
      return Boolean(result);
    });
  }

  /**
   * Reduce - accumulate value
   */
  private async reduce(
    items: any[], 
    expression: string, 
    initialValue: any, 
    context: ExecutionContext
  ): Promise<any> {
    if (!expression) {
      throw new Error('Reduce expression is required');
    }

    return items.reduce((accumulator, item, index) => {
      return this.evaluateExpression(expression, item, index, context, accumulator);
    }, initialValue ?? 0);
  }

  /**
   * Find - return first matching item
   */
  private async find(items: any[], expression: string, context: ExecutionContext): Promise<any> {
    if (!expression) {
      throw new Error('Find expression is required');
    }

    return items.find((item, index) => {
      const result = this.evaluateExpression(expression, item, index, context);
      return Boolean(result);
    });
  }

  /**
   * Some - check if any item matches
   */
  private async some(items: any[], expression: string, context: ExecutionContext): Promise<boolean> {
    if (!expression) {
      throw new Error('Some expression is required');
    }

    return items.some((item, index) => {
      const result = this.evaluateExpression(expression, item, index, context);
      return Boolean(result);
    });
  }

  /**
   * Every - check if all items match
   */
  private async every(items: any[], expression: string, context: ExecutionContext): Promise<boolean> {
    if (!expression) {
      throw new Error('Every expression is required');
    }

    return items.every((item, index) => {
      const result = this.evaluateExpression(expression, item, index, context);
      return Boolean(result);
    });
  }

  /**
   * Evaluate expression with item context
   */
  private evaluateExpression(
    expression: string,
    item: any,
    index: number,
    context: ExecutionContext,
    accumulator?: any
  ): any {
    try {
      // Create safe context
      const nodeData: Record<string, any> = {};
      context.nodeData.forEach((value, key) => {
        nodeData[key] = value;
      });

      const func = new Function(
        'item',
        'index',
        'context',
        'nodeData',
        'variables',
        'accumulator',
        `
        'use strict';
        return (${expression});
        `
      );

      return func(item, index, context, nodeData, context.variables, accumulator);

    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get value by path
   */
  private getValueByPath(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    const nodeId = parts[0];
    
    let value = context.nodeData.get(nodeId);
    
    for (let i = 1; i < parts.length; i++) {
      value = value?.[parts[i]];
      if (value === undefined) break;
    }
    
    return value;
  }

  validate(node: WorkflowNode): boolean | string {
    const { operation, items, itemsPath, mapExpression, filterExpression, reduceExpression } = node.data.parameters;
    
    if (!operation) {
      return 'Operation is required';
    }

    if (!items && !itemsPath) {
      return 'Either items or itemsPath is required';
    }

    if (operation === 'map' && !mapExpression) {
      return 'Map expression is required for map operation';
    }

    if (['filter', 'find', 'some', 'every'].includes(operation) && !filterExpression) {
      return `Filter expression is required for ${operation} operation`;
    }

    if (operation === 'reduce' && !reduceExpression) {
      return 'Reduce expression is required for reduce operation';
    }
    
    return true;
  }
}
