import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface MySQLConfig {
  connection: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  operation: 'query' | 'insert' | 'update' | 'delete' | 'select';
  query?: string;
  table?: string;
  data?: Record<string, any> | Record<string, any>[];
  where?: Record<string, any>;
  columns?: string[];
  limit?: number;
  offset?: number;
}

export class MySQLNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as MySQLConfig;
      const operation = config.operation;

      // Import mysql2 dynamically
      const mysql = await import('mysql2/promise');
      
      // Create connection
      const connection = await mysql.createConnection({
        host: config.connection.host,
        port: config.connection.port,
        user: config.connection.user,
        password: config.connection.password,
        database: config.connection.database,
      });

      let result: any;

      try {
        switch (operation) {
          case 'query':
            // Execute raw SQL query
            if (!config.query) {
              throw new Error('Query is required for query operation');
            }
            const [rows] = await connection.execute(config.query);
            result = {
              success: true,
              rows: Array.isArray(rows) ? rows : [rows],
              rowCount: Array.isArray(rows) ? rows.length : 1,
            };
            break;

          case 'select':
            // Select with query builder
            if (!config.table) {
              throw new Error('Table name is required for select operation');
            }

            let selectQuery = `SELECT ${config.columns?.join(', ') || '*'} FROM ${config.table}`;
            const selectParams: any[] = [];

            if (config.where) {
              const whereClauses = Object.entries(config.where).map(([key]) => `${key} = ?`);
              selectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
              selectParams.push(...Object.values(config.where));
            }

            if (config.limit) {
              selectQuery += ` LIMIT ${config.limit}`;
            }

            if (config.offset) {
              selectQuery += ` OFFSET ${config.offset}`;
            }

            const [selectRows] = await connection.execute(selectQuery, selectParams);
            result = {
              success: true,
              rows: Array.isArray(selectRows) ? selectRows : [selectRows],
              rowCount: Array.isArray(selectRows) ? selectRows.length : 1,
            };
            break;

          case 'insert':
            // Insert data
            if (!config.table || !config.data) {
              throw new Error('Table name and data are required for insert operation');
            }

            const insertData = Array.isArray(config.data) ? config.data : [config.data];
            const insertResults = [];

            for (const row of insertData) {
              const columns = Object.keys(row);
              const values = Object.values(row);
              const placeholders = columns.map(() => '?').join(', ');
              
              const insertQuery = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders})`;
              const [insertResult] = await connection.execute(insertQuery, values);
              insertResults.push(insertResult);
            }

            result = {
              success: true,
              insertedCount: insertResults.length,
              results: insertResults,
            };
            break;

          case 'update':
            // Update data
            if (!config.table || !config.data || !config.where) {
              throw new Error('Table name, data, and where clause are required for update operation');
            }

            const setClauses = Object.entries(config.data).map(([key]) => `${key} = ?`);
            const whereClauses = Object.entries(config.where).map(([key]) => `${key} = ?`);
            
            const updateQuery = `UPDATE ${config.table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
            const updateParams = [...Object.values(config.data), ...Object.values(config.where)];
            
            const [updateResult] = await connection.execute(updateQuery, updateParams);
            
            result = {
              success: true,
              affectedRows: (updateResult as any).affectedRows,
              changedRows: (updateResult as any).changedRows,
            };
            break;

          case 'delete':
            // Delete data
            if (!config.table || !config.where) {
              throw new Error('Table name and where clause are required for delete operation');
            }

            const deleteWhereClauses = Object.entries(config.where).map(([key]) => `${key} = ?`);
            const deleteQuery = `DELETE FROM ${config.table} WHERE ${deleteWhereClauses.join(' AND ')}`;
            const deleteParams = Object.values(config.where);
            
            const [deleteResult] = await connection.execute(deleteQuery, deleteParams);
            
            result = {
              success: true,
              affectedRows: (deleteResult as any).affectedRows,
            };
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } finally {
        await connection.end();
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
        error: error.message || 'MySQL operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as MySQLConfig;

    if (!config.connection?.host || !config.connection?.user || !config.connection?.database) {
      return 'MySQL connection details (host, user, database) are required';
    }

    if (!config.operation) {
      return 'Operation is required (query, insert, update, delete, select)';
    }

    const validOperations = ['query', 'insert', 'update', 'delete', 'select'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (config.operation === 'query' && !config.query) {
      return 'Query is required for query operation';
    }

    if (['select', 'insert', 'update', 'delete'].includes(config.operation) && !config.table) {
      return `Table name is required for ${config.operation} operation`;
    }

    if (config.operation === 'insert' && !config.data) {
      return 'Data is required for insert operation';
    }

    if (config.operation === 'update' && (!config.data || !config.where)) {
      return 'Data and where clause are required for update operation';
    }

    if (config.operation === 'delete' && !config.where) {
      return 'Where clause is required for delete operation';
    }

    return true;
  }
}
