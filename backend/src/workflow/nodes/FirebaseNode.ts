import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface FirebaseConfig {
  connection: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  operation: 'get' | 'set' | 'add' | 'update' | 'delete' | 'query';
  collection: string;
  documentId?: string;
  data?: Record<string, any>;
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: any;
  }>;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export class FirebaseNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as FirebaseConfig;
      const operation = config.operation;

      // Import Firebase Admin dynamically
      const admin = await import('firebase-admin');
      
      // Initialize Firebase if not already initialized
      let app;
      try {
        app = admin.app();
      } catch (error) {
        app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.connection.projectId,
            clientEmail: config.connection.clientEmail,
            privateKey: config.connection.privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }

      const db = admin.firestore(app);
      let result: any;

      switch (operation) {
        case 'get':
          // Get document(s)
          if (config.documentId) {
            // Get single document
            const docRef = db.collection(config.collection).doc(config.documentId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
              throw new Error('Document not found');
            }

            result = {
              success: true,
              id: docSnap.id,
              data: docSnap.data(),
            };
          } else {
            // Get all documents in collection
            const querySnapshot = await db.collection(config.collection).get();
            const documents = querySnapshot.docs.map(doc => ({
              id: doc.id,
              data: doc.data(),
            }));

            result = {
              success: true,
              count: documents.length,
              documents,
            };
          }
          break;

        case 'set':
          // Set document (create or overwrite)
          if (!config.documentId) {
            throw new Error('Document ID is required for set operation');
          }
          if (!config.data) {
            throw new Error('Data is required for set operation');
          }

          const setRef = db.collection(config.collection).doc(config.documentId);
          await setRef.set(config.data);

          result = {
            success: true,
            id: config.documentId,
            message: 'Document set successfully',
          };
          break;

        case 'add':
          // Add document (auto-generate ID)
          if (!config.data) {
            throw new Error('Data is required for add operation');
          }

          const addRef = await db.collection(config.collection).add(config.data);

          result = {
            success: true,
            id: addRef.id,
            message: 'Document added successfully',
          };
          break;

        case 'update':
          // Update document
          if (!config.documentId) {
            throw new Error('Document ID is required for update operation');
          }
          if (!config.data) {
            throw new Error('Data is required for update operation');
          }

          const updateRef = db.collection(config.collection).doc(config.documentId);
          await updateRef.update(config.data);

          result = {
            success: true,
            id: config.documentId,
            message: 'Document updated successfully',
          };
          break;

        case 'delete':
          // Delete document
          if (!config.documentId) {
            throw new Error('Document ID is required for delete operation');
          }

          const deleteRef = db.collection(config.collection).doc(config.documentId);
          await deleteRef.delete();

          result = {
            success: true,
            id: config.documentId,
            message: 'Document deleted successfully',
          };
          break;

        case 'query':
          // Query documents
          let query: any = db.collection(config.collection);

          // Apply where clauses
          if (config.where && config.where.length > 0) {
            for (const whereClause of config.where) {
              query = query.where(whereClause.field, whereClause.operator, whereClause.value);
            }
          }

          // Apply ordering
          if (config.orderBy) {
            query = query.orderBy(config.orderBy.field, config.orderBy.direction || 'asc');
          }

          // Apply limit
          if (config.limit) {
            query = query.limit(config.limit);
          }

          // Apply offset
          if (config.offset) {
            query = query.offset(config.offset);
          }

          const querySnapshot = await query.get();
          const documents = querySnapshot.docs.map((doc: any) => ({
            id: doc.id,
            data: doc.data(),
          }));

          result = {
            success: true,
            count: documents.length,
            documents,
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
        error: error.message || 'Firebase operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as FirebaseConfig;

    if (!config.connection?.projectId) {
      return 'Firebase project ID is required';
    }

    if (!config.connection?.clientEmail) {
      return 'Firebase client email is required';
    }

    if (!config.connection?.privateKey) {
      return 'Firebase private key is required';
    }

    if (!config.collection) {
      return 'Collection name is required';
    }

    if (!config.operation) {
      return 'Operation is required (get, set, add, update, delete, query)';
    }

    const validOperations = ['get', 'set', 'add', 'update', 'delete', 'query'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (['set', 'update', 'delete'].includes(config.operation) && !config.documentId) {
      return `Document ID is required for ${config.operation} operation`;
    }

    if (['set', 'add', 'update'].includes(config.operation) && !config.data) {
      return `Data is required for ${config.operation} operation`;
    }

    return true;
  }
}
