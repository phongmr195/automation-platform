/**
 * Database Node
 * Execute PostgreSQL database queries
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { PrismaClient } from '@prisma/client';

export class DatabaseExecutor implements INodeExecutor {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { 
        operation,
        table,
        query,
        data,
        where,
        select,
        orderBy,
        limit,
        skip,
      } = node.data.parameters;

      let result: any;

      switch (operation) {
        case 'findMany':
          result = await this.findMany(table, { where, select, orderBy, limit, skip });
          break;
        
        case 'findUnique':
        case 'findFirst':
          result = await this.findFirst(table, { where, select });
          break;
        
        case 'create':
          result = await this.create(table, data);
          break;
        
        case 'update':
          result = await this.update(table, where, data);
          break;
        
        case 'delete':
          result = await this.delete(table, where);
          break;
        
        case 'count':
          result = await this.count(table, where);
          break;
        
        case 'raw':
          result = await this.executeRaw(query, context);
          break;
        
        default:
          throw new Error(`Unknown database operation: ${operation}`);
      }

      return {
        success: true,
        output: {
          operation,
          table,
          result,
          rowCount: Array.isArray(result) ? result.length : 1,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Database operation failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Find many records
   */
  private async findMany(table: string, options: any): Promise<any[]> {
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Table ${table} not found in Prisma schema`);
    }

    return await model.findMany({
      where: options.where,
      select: options.select,
      orderBy: options.orderBy,
      take: options.limit,
      skip: options.skip,
    });
  }

  /**
   * Find first record
   */
  private async findFirst(table: string, options: any): Promise<any> {
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Table ${table} not found in Prisma schema`);
    }

    return await model.findFirst({
      where: options.where,
      select: options.select,
    });
  }

  /**
   * Create record
   */
  private async create(table: string, data: any): Promise<any> {
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Table ${table} not found in Prisma schema`);
    }

    return await model.create({
      data,
    });
  }

  /**
   * Update records
   */
  private async update(table: string, where: any, data: any): Promise<any> {
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Table ${table} not found in Prisma schema`);
    }

    // Use updateMany to return count
    return await model.updateMany({
      where,
      data,
    });
  }

  /**
   * Delete records
   */
  private async delete(table: string, where: any): Promise<any> {
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Table ${table} not found in Prisma schema`);
    }

    return await model.deleteMany({
      where,
    });
  }

  /**
   * Count records
   */
  private async count(table: string, where: any): Promise<number> {
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Table ${table} not found in Prisma schema`);
    }

    return await model.count({
      where,
    });
  }

  /**
   * Execute raw SQL query
   */
  private async executeRaw(query: string, context: ExecutionContext): Promise<any> {
    // Replace variables in query
    const processedQuery = this.replaceVariables(query, context);
    
    return await this.prisma.$queryRawUnsafe(processedQuery);
  }

  /**
   * Replace variables in SQL query
   */
  private replaceVariables(text: string, context: ExecutionContext): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      const nodeId = parts[0];
      
      let value = context.nodeData.get(nodeId);
      
      for (let i = 1; i < parts.length; i++) {
        value = value?.[parts[i]];
      }
      
      // Escape SQL value
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      
      return value !== undefined ? String(value) : match;
    });
  }

  validate(node: WorkflowNode): boolean | string {
    const { operation, table, query, data, where } = node.data.parameters;
    
    if (!operation) {
      return 'Operation is required';
    }

    if (operation === 'raw') {
      if (!query) {
        return 'Query is required for raw operation';
      }
    } else {
      if (!table) {
        return 'Table is required';
      }

      if (operation === 'create' && !data) {
        return 'Data is required for create operation';
      }

      if (operation === 'update' && (!data || !where)) {
        return 'Data and where are required for update operation';
      }

      if (operation === 'delete' && !where) {
        return 'Where is required for delete operation';
      }
    }
    
    return true;
  }

  /**
   * Cleanup
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
