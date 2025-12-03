/**
 * Condition/IF Node
 * Route workflow execution based on conditions
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

export class ConditionExecutor implements INodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { conditions, defaultOutput = 'false' } = node.data.parameters;

      // Evaluate conditions in order
      for (const condition of conditions || []) {
        const result = this.evaluateCondition(condition, context);
        
        if (result) {
          return {
            success: true,
            output: {
              matched: true,
              output: condition.output || 'true',
              condition: condition.expression,
            },
            duration: Date.now() - startTime,
          };
        }
      }

      // No condition matched
      return {
        success: true,
        output: {
          matched: false,
          output: defaultOutput,
          condition: null,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Condition evaluation failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: any, context: ExecutionContext): boolean {
    const { left, operator, right, expression } = condition;

    // If custom expression provided, use it
    if (expression) {
      return this.evaluateExpression(expression, context);
    }

    // Otherwise use left operator right format
    const leftValue = this.resolveValue(left, context);
    const rightValue = this.resolveValue(right, context);

    switch (operator) {
      case '==':
      case 'equals':
        return leftValue == rightValue;
      
      case '===':
      case 'strictEquals':
        return leftValue === rightValue;
      
      case '!=':
      case 'notEquals':
        return leftValue != rightValue;
      
      case '!==':
      case 'strictNotEquals':
        return leftValue !== rightValue;
      
      case '>':
      case 'greaterThan':
        return leftValue > rightValue;
      
      case '>=':
      case 'greaterThanOrEquals':
        return leftValue >= rightValue;
      
      case '<':
      case 'lessThan':
        return leftValue < rightValue;
      
      case '<=':
      case 'lessThanOrEquals':
        return leftValue <= rightValue;
      
      case 'contains':
        return String(leftValue).includes(String(rightValue));
      
      case 'startsWith':
        return String(leftValue).startsWith(String(rightValue));
      
      case 'endsWith':
        return String(leftValue).endsWith(String(rightValue));
      
      case 'matches':
      case 'regex':
        return new RegExp(rightValue).test(String(leftValue));
      
      case 'in':
        return Array.isArray(rightValue) && rightValue.includes(leftValue);
      
      case 'exists':
        return leftValue !== undefined && leftValue !== null;
      
      case 'isEmpty':
        return !leftValue || 
               (Array.isArray(leftValue) && leftValue.length === 0) ||
               (typeof leftValue === 'object' && Object.keys(leftValue).length === 0);
      
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Evaluate JavaScript expression
   */
  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    try {
      // Create safe context
      const nodeData: Record<string, any> = {};
      context.nodeData.forEach((value, key) => {
        nodeData[key] = value;
      });

      const func = new Function(
        'context',
        'nodeData',
        'variables',
        `
        'use strict';
        return (${expression});
        `
      );

      return Boolean(func(context, nodeData, context.variables));

    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resolve value (can be a path to node data or literal value)
   */
  private resolveValue(value: any, context: ExecutionContext): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Check if it's a node reference (e.g., "node-1.data.field")
    if (value.includes('.')) {
      const parts = value.split('.');
      const nodeId = parts[0];
      
      let resolved = context.nodeData.get(nodeId);
      
      for (let i = 1; i < parts.length; i++) {
        resolved = resolved?.[parts[i]];
      }
      
      return resolved;
    }

    // Check if it's a variable reference (e.g., "{{variable}}")
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const varName = value.slice(2, -2).trim();
      return context.variables[varName];
    }

    // Otherwise return as literal
    return value;
  }

  validate(node: WorkflowNode): boolean | string {
    const { conditions } = node.data.parameters;
    
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return 'At least one condition is required';
    }

    for (const condition of conditions) {
      if (!condition.expression && (!condition.left || !condition.operator)) {
        return 'Each condition must have either expression or (left + operator)';
      }
    }
    
    return true;
  }
}
