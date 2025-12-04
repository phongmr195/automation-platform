import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface MongoDBConfig {
  connection: {
    uri: string;
    database: string;
  };
  operation: 'find' | 'findOne' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'deleteOne' | 'deleteMany' | 'aggregate' | 'count';
  collection: string;
  filter?: Record<string, any>;
  document?: Record<string, any>;
  documents?: Record<string, any>[];
  update?: Record<string, any>;
  projection?: Record<string, any>;
  sort?: Record<string, any>;
  limit?: number;
  skip?: number;
  pipeline?: any[];
  options?: Record<string, any>;
}

export class MongoDBNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as MongoDBConfig;
      const operation = config.operation;

      // Import mongodb dynamically
      const { MongoClient } = await import('mongodb');
      
      // Create client and connect
      const client = new MongoClient(config.connection.uri);
      await client.connect();

      let result: any;

      try {
        const db = client.db(config.connection.database);
        const collection = db.collection(config.collection);

        switch (operation) {
          case 'find':
            // Find documents
            const findCursor = collection.find(
              config.filter || {},
              {
                projection: config.projection,
                sort: config.sort,
                limit: config.limit,
                skip: config.skip,
                ...config.options,
              }
            );
            
            const documents = await findCursor.toArray();
            
            result = {
              success: true,
              documents,
              count: documents.length,
            };
            break;

          case 'findOne':
            // Find one document
            const document = await collection.findOne(
              config.filter || {},
              {
                projection: config.projection,
                ...config.options,
              }
            );
            
            result = {
              success: true,
              document,
              found: document !== null,
            };
            break;

          case 'insertOne':
            // Insert one document
            if (!config.document) {
              throw new Error('Document is required for insertOne operation');
            }
            
            const insertOneResult = await collection.insertOne(config.document, config.options);
            
            result = {
              success: true,
              insertedId: insertOneResult.insertedId,
              acknowledged: insertOneResult.acknowledged,
            };
            break;

          case 'insertMany':
            // Insert many documents
            if (!config.documents || !Array.isArray(config.documents)) {
              throw new Error('Documents array is required for insertMany operation');
            }
            
            const insertManyResult = await collection.insertMany(config.documents, config.options);
            
            result = {
              success: true,
              insertedCount: insertManyResult.insertedCount,
              insertedIds: insertManyResult.insertedIds,
              acknowledged: insertManyResult.acknowledged,
            };
            break;

          case 'updateOne':
            // Update one document
            if (!config.filter || !config.update) {
              throw new Error('Filter and update are required for updateOne operation');
            }
            
            const updateOneResult = await collection.updateOne(
              config.filter,
              config.update,
              config.options
            );
            
            result = {
              success: true,
              matchedCount: updateOneResult.matchedCount,
              modifiedCount: updateOneResult.modifiedCount,
              acknowledged: updateOneResult.acknowledged,
              upsertedId: updateOneResult.upsertedId,
            };
            break;

          case 'updateMany':
            // Update many documents
            if (!config.filter || !config.update) {
              throw new Error('Filter and update are required for updateMany operation');
            }
            
            const updateManyResult = await collection.updateMany(
              config.filter,
              config.update,
              config.options
            );
            
            result = {
              success: true,
              matchedCount: updateManyResult.matchedCount,
              modifiedCount: updateManyResult.modifiedCount,
              acknowledged: updateManyResult.acknowledged,
              upsertedId: updateManyResult.upsertedId,
            };
            break;

          case 'deleteOne':
            // Delete one document
            if (!config.filter) {
              throw new Error('Filter is required for deleteOne operation');
            }
            
            const deleteOneResult = await collection.deleteOne(config.filter, config.options);
            
            result = {
              success: true,
              deletedCount: deleteOneResult.deletedCount,
              acknowledged: deleteOneResult.acknowledged,
            };
            break;

          case 'deleteMany':
            // Delete many documents
            if (!config.filter) {
              throw new Error('Filter is required for deleteMany operation');
            }
            
            const deleteManyResult = await collection.deleteMany(config.filter, config.options);
            
            result = {
              success: true,
              deletedCount: deleteManyResult.deletedCount,
              acknowledged: deleteManyResult.acknowledged,
            };
            break;

          case 'aggregate':
            // Aggregate pipeline
            if (!config.pipeline || !Array.isArray(config.pipeline)) {
              throw new Error('Pipeline array is required for aggregate operation');
            }
            
            const aggregateCursor = collection.aggregate(config.pipeline, config.options);
            const aggregateResults = await aggregateCursor.toArray();
            
            result = {
              success: true,
              results: aggregateResults,
              count: aggregateResults.length,
            };
            break;

          case 'count':
            // Count documents
            const count = await collection.countDocuments(config.filter || {}, config.options);
            
            result = {
              success: true,
              count,
            };
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } finally {
        await client.close();
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
        error: error.message || 'MongoDB operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as MongoDBConfig;

    if (!config.connection?.uri || !config.connection?.database) {
      return 'MongoDB connection details (uri, database) are required';
    }

    if (!config.collection) {
      return 'Collection name is required';
    }

    if (!config.operation) {
      return 'Operation is required (find, findOne, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, aggregate, count)';
    }

    const validOperations = ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate', 'count'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (config.operation === 'insertOne' && !config.document) {
      return 'Document is required for insertOne operation';
    }

    if (config.operation === 'insertMany' && !config.documents) {
      return 'Documents array is required for insertMany operation';
    }

    if (['updateOne', 'updateMany'].includes(config.operation) && (!config.filter || !config.update)) {
      return `Filter and update are required for ${config.operation} operation`;
    }

    if (['deleteOne', 'deleteMany'].includes(config.operation) && !config.filter) {
      return `Filter is required for ${config.operation} operation`;
    }

    if (config.operation === 'aggregate' && !config.pipeline) {
      return 'Pipeline is required for aggregate operation';
    }

    return true;
  }
}
