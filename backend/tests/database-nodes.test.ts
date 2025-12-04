/**
 * Database Nodes Test
 * Test all database node implementations
 */

import { describe, test, expect } from '@jest/globals';
import { 
  MySQLNode, 
  MongoDBNode, 
  RedisNode, 
  AirtableNode, 
  FirebaseNode 
} from '../src/workflow/nodes';

describe('Database Nodes', () => {
  describe('MySQLNode', () => {
    const node = new MySQLNode();

    test('should validate MySQL node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-mysql',
        type: 'mysql',
        data: {
          parameters: {
            operation: 'query',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('MySQL connection details');
    });

    test('should validate MySQL node with missing operation', () => {
      const workflowNode: any = {
        id: 'test-mysql',
        type: 'mysql',
        data: {
          parameters: {
            connection: {
              host: 'localhost',
              user: 'root',
              database: 'test',
            },
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Operation is required');
    });

    test('should validate MySQL query operation without query', () => {
      const workflowNode: any = {
        id: 'test-mysql',
        type: 'mysql',
        data: {
          parameters: {
            connection: {
              host: 'localhost',
              user: 'root',
              database: 'test',
            },
            operation: 'query',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Query is required');
    });

    test('should pass validation with valid query operation', () => {
      const workflowNode: any = {
        id: 'test-mysql',
        type: 'mysql',
        data: {
          parameters: {
            connection: {
              host: 'localhost',
              port: 3306,
              user: 'root',
              password: 'password',
              database: 'test',
            },
            operation: 'query',
            query: 'SELECT * FROM users',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });
  });

  describe('MongoDBNode', () => {
    const node = new MongoDBNode();

    test('should validate MongoDB node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-mongodb',
        type: 'mongodb',
        data: {
          parameters: {
            collection: 'users',
            operation: 'find',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('MongoDB connection details');
    });

    test('should validate MongoDB node with missing collection', () => {
      const workflowNode: any = {
        id: 'test-mongodb',
        type: 'mongodb',
        data: {
          parameters: {
            connection: {
              uri: 'mongodb://localhost:27017',
              database: 'test',
            },
            operation: 'find',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Collection name is required');
    });

    test('should pass validation with valid find operation', () => {
      const workflowNode: any = {
        id: 'test-mongodb',
        type: 'mongodb',
        data: {
          parameters: {
            connection: {
              uri: 'mongodb://localhost:27017',
              database: 'test',
            },
            collection: 'users',
            operation: 'find',
            filter: { age: { $gte: 18 } },
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });
  });

  describe('RedisNode', () => {
    const node = new RedisNode();

    test('should validate Redis node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-redis',
        type: 'redis',
        data: {
          parameters: {
            operation: 'get',
            key: 'test-key',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Redis connection details');
    });

    test('should validate Redis node with missing key', () => {
      const workflowNode: any = {
        id: 'test-redis',
        type: 'redis',
        data: {
          parameters: {
            connection: {
              host: 'localhost',
              port: 6379,
            },
            operation: 'get',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Key is required');
    });

    test('should pass validation with valid get operation', () => {
      const workflowNode: any = {
        id: 'test-redis',
        type: 'redis',
        data: {
          parameters: {
            connection: {
              host: 'localhost',
              port: 6379,
            },
            operation: 'get',
            key: 'test-key',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });

    test('should validate Redis set operation with missing value', () => {
      const workflowNode: any = {
        id: 'test-redis',
        type: 'redis',
        data: {
          parameters: {
            connection: {
              host: 'localhost',
              port: 6379,
            },
            operation: 'set',
            key: 'test-key',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Value is required');
    });
  });

  describe('AirtableNode', () => {
    const node = new AirtableNode();

    test('should validate Airtable node with missing API key', () => {
      const workflowNode: any = {
        id: 'test-airtable',
        type: 'airtable',
        data: {
          parameters: {
            connection: {
              baseId: 'appXXXXXXXXXXXXXX',
            },
            table: 'Users',
            operation: 'list',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Airtable API key');
    });

    test('should validate Airtable node with missing table', () => {
      const workflowNode: any = {
        id: 'test-airtable',
        type: 'airtable',
        data: {
          parameters: {
            connection: {
              apiKey: 'keyXXXXXXXXXXXXXX',
              baseId: 'appXXXXXXXXXXXXXX',
            },
            operation: 'list',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Table name is required');
    });

    test('should pass validation with valid list operation', () => {
      const workflowNode: any = {
        id: 'test-airtable',
        type: 'airtable',
        data: {
          parameters: {
            connection: {
              apiKey: 'keyXXXXXXXXXXXXXX',
              baseId: 'appXXXXXXXXXXXXXX',
            },
            table: 'Users',
            operation: 'list',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });
  });

  describe('FirebaseNode', () => {
    const node = new FirebaseNode();

    test('should validate Firebase node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-firebase',
        type: 'firebase',
        data: {
          parameters: {
            collection: 'users',
            operation: 'get',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Firebase project ID');
    });

    test('should validate Firebase node with missing collection', () => {
      const workflowNode: any = {
        id: 'test-firebase',
        type: 'firebase',
        data: {
          parameters: {
            connection: {
              projectId: 'test-project',
              clientEmail: 'test@test.com',
              privateKey: 'test-key',
            },
            operation: 'get',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Collection name is required');
    });

    test('should pass validation with valid get operation', () => {
      const workflowNode: any = {
        id: 'test-firebase',
        type: 'firebase',
        data: {
          parameters: {
            connection: {
              projectId: 'test-project',
              clientEmail: 'test@test.com',
              privateKey: 'test-key',
            },
            collection: 'users',
            operation: 'get',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });

    test('should validate Firebase set operation with missing documentId', () => {
      const workflowNode: any = {
        id: 'test-firebase',
        type: 'firebase',
        data: {
          parameters: {
            connection: {
              projectId: 'test-project',
              clientEmail: 'test@test.com',
              privateKey: 'test-key',
            },
            collection: 'users',
            operation: 'set',
            data: { name: 'John' },
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Document ID is required');
    });
  });
});
