import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface SupabaseConfig {
  connection: {
    url: string;
    key: string;
  };
  operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' | 'rpc';
  table?: string;
  functionName?: string;
  columns?: string;
  filter?: Record<string, any>;
  data?: Record<string, any> | Record<string, any>[];
  count?: boolean;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  single?: boolean;
}

export class SupabaseNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as SupabaseConfig;
      const operation = config.operation;

      // Import Supabase client dynamically
      const { createClient } = await import('@supabase/supabase-js');
      
      // Create client
      const supabase = createClient(config.connection.url, config.connection.key);

      let result: any;

      switch (operation) {
        case 'select':
          // Select data
          if (!config.table) {
            throw new Error('Table name is required for select operation');
          }

          let selectQuery = supabase
            .from(config.table)
            .select(config.columns || '*', { count: config.count ? 'exact' : undefined });

          // Apply filters
          if (config.filter) {
            for (const [column, value] of Object.entries(config.filter)) {
              if (typeof value === 'object' && value !== null) {
                // Handle complex filters (e.g., { gt: 10 }, { eq: 'value' })
                const operator = Object.keys(value)[0];
                const operatorValue = value[operator];
                
                switch (operator) {
                  case 'eq':
                    selectQuery = selectQuery.eq(column, operatorValue);
                    break;
                  case 'neq':
                    selectQuery = selectQuery.neq(column, operatorValue);
                    break;
                  case 'gt':
                    selectQuery = selectQuery.gt(column, operatorValue);
                    break;
                  case 'gte':
                    selectQuery = selectQuery.gte(column, operatorValue);
                    break;
                  case 'lt':
                    selectQuery = selectQuery.lt(column, operatorValue);
                    break;
                  case 'lte':
                    selectQuery = selectQuery.lte(column, operatorValue);
                    break;
                  case 'like':
                    selectQuery = selectQuery.like(column, operatorValue);
                    break;
                  case 'ilike':
                    selectQuery = selectQuery.ilike(column, operatorValue);
                    break;
                  case 'in':
                    selectQuery = selectQuery.in(column, operatorValue);
                    break;
                  case 'is':
                    selectQuery = selectQuery.is(column, operatorValue);
                    break;
                  default:
                    selectQuery = selectQuery.eq(column, value);
                }
              } else {
                selectQuery = selectQuery.eq(column, value);
              }
            }
          }

          // Apply ordering
          if (config.orderBy) {
            selectQuery = selectQuery.order(config.orderBy.column, {
              ascending: config.orderBy.ascending !== false,
            });
          }

          // Apply limit and offset
          if (config.limit !== undefined) {
            selectQuery = selectQuery.limit(config.limit);
          }
          if (config.offset !== undefined) {
            selectQuery = selectQuery.range(
              config.offset,
              config.offset + (config.limit || 1000) - 1
            );
          }

          // Get single record or multiple
          if (config.single) {
            selectQuery = selectQuery.single();
          }

          const selectResponse = await selectQuery;

          if (selectResponse.error) {
            throw new Error(selectResponse.error.message);
          }

          result = {
            success: true,
            data: selectResponse.data,
            count: selectResponse.count,
          };
          break;

        case 'insert':
          // Insert data
          if (!config.table) {
            throw new Error('Table name is required for insert operation');
          }
          if (!config.data) {
            throw new Error('Data is required for insert operation');
          }

          const insertResponse = await supabase.from(config.table).insert(config.data).select();

          if (insertResponse.error) {
            throw new Error(insertResponse.error.message);
          }

          result = {
            success: true,
            data: insertResponse.data,
          };
          break;

        case 'update':
          // Update data
          if (!config.table) {
            throw new Error('Table name is required for update operation');
          }
          if (!config.data) {
            throw new Error('Data is required for update operation');
          }

          let updateQuery = supabase.from(config.table).update(config.data);

          // Apply filters
          if (config.filter) {
            for (const [column, value] of Object.entries(config.filter)) {
              updateQuery = updateQuery.eq(column, value);
            }
          }

          const updateResponse = await updateQuery.select();

          if (updateResponse.error) {
            throw new Error(updateResponse.error.message);
          }

          result = {
            success: true,
            data: updateResponse.data,
          };
          break;

        case 'upsert':
          // Upsert data (insert or update)
          if (!config.table) {
            throw new Error('Table name is required for upsert operation');
          }
          if (!config.data) {
            throw new Error('Data is required for upsert operation');
          }

          const upsertResponse = await supabase.from(config.table).upsert(config.data).select();

          if (upsertResponse.error) {
            throw new Error(upsertResponse.error.message);
          }

          result = {
            success: true,
            data: upsertResponse.data,
          };
          break;

        case 'delete':
          // Delete data
          if (!config.table) {
            throw new Error('Table name is required for delete operation');
          }

          let deleteQuery = supabase.from(config.table).delete();

          // Apply filters
          if (config.filter) {
            for (const [column, value] of Object.entries(config.filter)) {
              deleteQuery = deleteQuery.eq(column, value);
            }
          }

          const deleteResponse = await deleteQuery.select();

          if (deleteResponse.error) {
            throw new Error(deleteResponse.error.message);
          }

          result = {
            success: true,
            data: deleteResponse.data,
          };
          break;

        case 'rpc':
          // Call stored procedure
          if (!config.functionName) {
            throw new Error('Function name is required for rpc operation');
          }

          const rpcResponse = await supabase.rpc(config.functionName, config.data || {});

          if (rpcResponse.error) {
            throw new Error(rpcResponse.error.message);
          }

          result = {
            success: true,
            data: rpcResponse.data,
          };
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: result,
        duration,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message || 'Supabase operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as SupabaseConfig;

    if (!config.connection?.url) {
      return 'Supabase URL is required';
    }

    if (!config.connection?.key) {
      return 'Supabase API key is required';
    }

    if (!config.operation) {
      return 'Operation is required (select, insert, update, upsert, delete, rpc)';
    }

    const validOperations = ['select', 'insert', 'update', 'upsert', 'delete', 'rpc'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (config.operation !== 'rpc' && !config.table) {
      return 'Table name is required for this operation';
    }

    if (['insert', 'update', 'upsert'].includes(config.operation) && !config.data) {
      return `Data is required for ${config.operation} operation`;
    }

    if (config.operation === 'rpc' && !config.functionName) {
      return 'Function name is required for rpc operation';
    }

    return true;
  }
}
