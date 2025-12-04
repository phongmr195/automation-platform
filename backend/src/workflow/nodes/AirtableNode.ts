import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface AirtableConfig {
  connection: {
    apiKey: string;
    baseId: string;
  };
  operation: 'list' | 'get' | 'create' | 'update' | 'delete' | 'query';
  table: string;
  recordId?: string;
  fields?: Record<string, any>;
  filterByFormula?: string;
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  maxRecords?: number;
  pageSize?: number;
  view?: string;
}

export class AirtableNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as AirtableConfig;
      const operation = config.operation;

      // Import Airtable dynamically
      const Airtable = await import('airtable');
      
      // Configure Airtable
      Airtable.default.configure({
        apiKey: config.connection.apiKey,
      });

      const base = Airtable.default.base(config.connection.baseId);
      const table = base(config.table);

      let result: any;

      switch (operation) {
        case 'list':
          // List all records
          const listParams: any = {};

          if (config.view) {
            listParams.view = config.view;
          }

          if (config.maxRecords) {
            listParams.maxRecords = config.maxRecords;
          }

          if (config.pageSize) {
            listParams.pageSize = config.pageSize;
          }

          const listRecords = await table.select(listParams).all();

          result = {
            success: true,
            count: listRecords.length,
            records: listRecords.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime,
            })),
          };
          break;

        case 'get':
          // Get single record
          if (!config.recordId) {
            throw new Error('Record ID is required for get operation');
          }

          const getRecord = await table.find(config.recordId);

          result = {
            success: true,
            id: getRecord.id,
            fields: getRecord.fields,
            createdTime: getRecord._rawJson.createdTime,
          };
          break;

        case 'create':
          // Create record(s)
          if (!config.fields) {
            throw new Error('Fields are required for create operation');
          }

          const createRecords = Array.isArray(config.fields)
            ? config.fields
            : [config.fields];

          const created = await table.create(
            createRecords.map(fields => ({ fields }))
          );

          result = {
            success: true,
            count: created.length,
            records: created.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime,
            })),
          };
          break;

        case 'update':
          // Update record(s)
          if (!config.recordId && !Array.isArray(config.fields)) {
            throw new Error('Record ID is required for single record update');
          }
          if (!config.fields) {
            throw new Error('Fields are required for update operation');
          }

          let updated: any[];

          if (config.recordId) {
            // Update single record
            const updatedRecord = await table.update(config.recordId, config.fields);
            updated = [updatedRecord] as any[];
          } else {
            // Update multiple records
            if (!Array.isArray(config.fields)) {
              throw new Error('Fields must be an array for batch update');
            }
            const updatedRecords = await table.update(
              config.fields.map((item: any) => ({
                id: item.id,
                fields: item.fields,
              }))
            );
            updated = Array.from(updatedRecords) as any[];
          }

          result = {
            success: true,
            count: updated.length,
            records: updated.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime,
            })),
          };
          break;

        case 'delete':
          // Delete record(s)
          if (!config.recordId && !Array.isArray(config.fields)) {
            throw new Error('Record ID or record IDs array is required for delete operation');
          }

          let deleted: any[];

          if (config.recordId) {
            // Delete single record
            const deletedRecord = await table.destroy(config.recordId);
            deleted = [deletedRecord] as any[];
          } else {
            // Delete multiple records
            const recordIds = Array.isArray(config.fields)
              ? config.fields.map((item: any) => item.id || item)
              : [];
            const deletedRecords = await table.destroy(recordIds);
            deleted = Array.from(deletedRecords) as any[];
          }

          result = {
            success: true,
            count: deleted.length,
            deletedIds: deleted.map(record => record.id),
          };
          break;

        case 'query':
          // Query records with filters
          const queryParams: any = {};

          if (config.filterByFormula) {
            queryParams.filterByFormula = config.filterByFormula;
          }

          if (config.sort && config.sort.length > 0) {
            queryParams.sort = config.sort.map(s => ({
              field: s.field,
              direction: s.direction || 'asc',
            }));
          }

          if (config.maxRecords) {
            queryParams.maxRecords = config.maxRecords;
          }

          if (config.pageSize) {
            queryParams.pageSize = config.pageSize;
          }

          if (config.view) {
            queryParams.view = config.view;
          }

          const queryRecords = await table.select(queryParams).all();

          result = {
            success: true,
            count: queryRecords.length,
            records: queryRecords.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime,
            })),
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
        error: error.message || 'Airtable operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as AirtableConfig;

    if (!config.connection?.apiKey) {
      return 'Airtable API key is required';
    }

    if (!config.connection?.baseId) {
      return 'Airtable base ID is required';
    }

    if (!config.table) {
      return 'Table name is required';
    }

    if (!config.operation) {
      return 'Operation is required (list, get, create, update, delete, query)';
    }

    const validOperations = ['list', 'get', 'create', 'update', 'delete', 'query'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (config.operation === 'get' && !config.recordId) {
      return 'Record ID is required for get operation';
    }

    if (['create', 'update'].includes(config.operation) && !config.fields) {
      return `Fields are required for ${config.operation} operation`;
    }

    if (config.operation === 'delete' && !config.recordId && !config.fields) {
      return 'Record ID or record IDs array is required for delete operation';
    }

    return true;
  }
}
