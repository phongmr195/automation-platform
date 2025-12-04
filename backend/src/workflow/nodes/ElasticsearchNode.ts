import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface ElasticsearchConfig {
  connection: {
    node: string;
    auth?: {
      username: string;
      password: string;
    };
    apiKey?: string;
  };
  operation: 'search' | 'index' | 'get' | 'update' | 'delete' | 'bulk';
  index: string;
  id?: string;
  document?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  from?: number;
  size?: number;
}

export class ElasticsearchNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as ElasticsearchConfig;
      const operation = config.operation;

      // Import Elasticsearch client dynamically
      const { Client } = await import('@elastic/elasticsearch');
      
      // Create client
      const clientConfig: any = {
        node: config.connection.node,
      };

      if (config.connection.auth) {
        clientConfig.auth = config.connection.auth;
      } else if (config.connection.apiKey) {
        clientConfig.auth = {
          apiKey: config.connection.apiKey,
        };
      }

      const client = new Client(clientConfig);

      let result: any;

      switch (operation) {
        case 'search':
          // Search documents
          const searchResponse = await client.search({
            index: config.index,
            body: config.body || {
              query: config.query || { match_all: {} },
              from: config.from || 0,
              size: config.size || 10,
            },
          });

          result = {
            success: true,
            hits: searchResponse.hits.hits,
            total: searchResponse.hits.total,
            took: searchResponse.took,
          };
          break;

        case 'index':
          // Index a document
          if (!config.document) {
            throw new Error('Document is required for index operation');
          }

          const indexResponse = config.id
            ? await client.index({
                index: config.index,
                id: config.id,
                document: config.document,
              })
            : await client.index({
                index: config.index,
                document: config.document,
              });

          result = {
            success: true,
            id: indexResponse._id,
            index: indexResponse._index,
            version: indexResponse._version,
            result: indexResponse.result,
          };
          break;

        case 'get':
          // Get document by ID
          if (!config.id) {
            throw new Error('Document ID is required for get operation');
          }

          const getResponse = await client.get({
            index: config.index,
            id: config.id,
          });

          result = {
            success: true,
            id: getResponse._id,
            source: getResponse._source,
            found: getResponse.found,
          };
          break;

        case 'update':
          // Update document
          if (!config.id || !config.document) {
            throw new Error('Document ID and document are required for update operation');
          }

          const updateResponse = await client.update({
            index: config.index,
            id: config.id,
            doc: config.document,
          });

          result = {
            success: true,
            id: updateResponse._id,
            version: updateResponse._version,
            result: updateResponse.result,
          };
          break;

        case 'delete':
          // Delete document
          if (!config.id) {
            throw new Error('Document ID is required for delete operation');
          }

          const deleteResponse = await client.delete({
            index: config.index,
            id: config.id,
          });

          result = {
            success: true,
            id: deleteResponse._id,
            result: deleteResponse.result,
          };
          break;

        case 'bulk':
          // Bulk operations
          if (!config.body) {
            throw new Error('Body is required for bulk operation');
          }

          const bulkResponse = await client.bulk({
            body: config.body,
          });

          result = {
            success: true,
            took: bulkResponse.took,
            errors: bulkResponse.errors,
            items: bulkResponse.items,
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
        error: error.message || 'Elasticsearch operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as ElasticsearchConfig;

    if (!config.connection?.node) {
      return 'Elasticsearch node URL is required';
    }

    if (!config.index) {
      return 'Index name is required';
    }

    if (!config.operation) {
      return 'Operation is required (search, index, get, update, delete, bulk)';
    }

    const validOperations = ['search', 'index', 'get', 'update', 'delete', 'bulk'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (config.operation === 'index' && !config.document) {
      return 'Document is required for index operation';
    }

    if (['get', 'delete'].includes(config.operation) && !config.id) {
      return `Document ID is required for ${config.operation} operation`;
    }

    if (config.operation === 'update' && (!config.id || !config.document)) {
      return 'Document ID and document are required for update operation';
    }

    if (config.operation === 'bulk' && !config.body) {
      return 'Body is required for bulk operation';
    }

    return true;
  }
}
