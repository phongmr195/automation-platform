import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface RedisConfig {
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  operation: 'get' | 'set' | 'del' | 'exists' | 'expire' | 'ttl' | 'keys' | 'incr' | 'decr' | 'hget' | 'hset' | 'hgetall' | 'lpush' | 'rpush' | 'lpop' | 'rpop' | 'lrange' | 'sadd' | 'smembers' | 'srem';
  key: string;
  value?: string;
  field?: string;
  members?: string[];
  ttl?: number;
  pattern?: string;
  start?: number;
  stop?: number;
}

export class RedisNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as RedisConfig;
      const operation = config.operation;

      // Import ioredis dynamically
      const Redis = (await import('ioredis')).default;
      
      // Create Redis client
      const redis = new Redis({
        host: config.connection.host,
        port: config.connection.port,
        password: config.connection.password,
        db: config.connection.db || 0,
      });

      let result: any;

      try {
        switch (operation) {
          case 'get':
            // Get value by key
            const value = await redis.get(config.key);
            result = {
              success: true,
              key: config.key,
              value,
              exists: value !== null,
            };
            break;

          case 'set':
            // Set key-value pair
            if (config.value === undefined) {
              throw new Error('Value is required for set operation');
            }
            
            let setResult: string;
            if (config.ttl) {
              setResult = await redis.setex(config.key, config.ttl, config.value);
            } else {
              setResult = await redis.set(config.key, config.value);
            }
            
            result = {
              success: true,
              key: config.key,
              status: setResult,
            };
            break;

          case 'del':
            // Delete key
            const delCount = await redis.del(config.key);
            result = {
              success: true,
              key: config.key,
              deleted: delCount > 0,
              deletedCount: delCount,
            };
            break;

          case 'exists':
            // Check if key exists
            const exists = await redis.exists(config.key);
            result = {
              success: true,
              key: config.key,
              exists: exists === 1,
            };
            break;

          case 'expire':
            // Set expiration time
            if (!config.ttl) {
              throw new Error('TTL is required for expire operation');
            }
            
            const expireResult = await redis.expire(config.key, config.ttl);
            result = {
              success: true,
              key: config.key,
              ttl: config.ttl,
              set: expireResult === 1,
            };
            break;

          case 'ttl':
            // Get time to live
            const ttl = await redis.ttl(config.key);
            result = {
              success: true,
              key: config.key,
              ttl,
              exists: ttl !== -2,
              hasExpiration: ttl !== -1,
            };
            break;

          case 'keys':
            // Find keys by pattern
            const pattern = config.pattern || '*';
            const keys = await redis.keys(pattern);
            result = {
              success: true,
              pattern,
              keys,
              count: keys.length,
            };
            break;

          case 'incr':
            // Increment value
            const incrValue = await redis.incr(config.key);
            result = {
              success: true,
              key: config.key,
              value: incrValue,
            };
            break;

          case 'decr':
            // Decrement value
            const decrValue = await redis.decr(config.key);
            result = {
              success: true,
              key: config.key,
              value: decrValue,
            };
            break;

          case 'hget':
            // Get hash field
            if (!config.field) {
              throw new Error('Field is required for hget operation');
            }
            
            const fieldValue = await redis.hget(config.key, config.field);
            result = {
              success: true,
              key: config.key,
              field: config.field,
              value: fieldValue,
            };
            break;

          case 'hset':
            // Set hash field
            if (!config.field || config.value === undefined) {
              throw new Error('Field and value are required for hset operation');
            }
            
            const hsetResult = await redis.hset(config.key, config.field, config.value);
            result = {
              success: true,
              key: config.key,
              field: config.field,
              added: hsetResult === 1,
            };
            break;

          case 'hgetall':
            // Get all hash fields
            const hash = await redis.hgetall(config.key);
            result = {
              success: true,
              key: config.key,
              hash,
              fieldCount: Object.keys(hash).length,
            };
            break;

          case 'lpush':
            // Push to list (left)
            if (config.value === undefined) {
              throw new Error('Value is required for lpush operation');
            }
            
            const lpushLength = await redis.lpush(config.key, config.value);
            result = {
              success: true,
              key: config.key,
              length: lpushLength,
            };
            break;

          case 'rpush':
            // Push to list (right)
            if (config.value === undefined) {
              throw new Error('Value is required for rpush operation');
            }
            
            const rpushLength = await redis.rpush(config.key, config.value);
            result = {
              success: true,
              key: config.key,
              length: rpushLength,
            };
            break;

          case 'lpop':
            // Pop from list (left)
            const lpopValue = await redis.lpop(config.key);
            result = {
              success: true,
              key: config.key,
              value: lpopValue,
            };
            break;

          case 'rpop':
            // Pop from list (right)
            const rpopValue = await redis.rpop(config.key);
            result = {
              success: true,
              key: config.key,
              value: rpopValue,
            };
            break;

          case 'lrange':
            // Get list range
            const start = config.start || 0;
            const stop = config.stop || -1;
            const range = await redis.lrange(config.key, start, stop);
            result = {
              success: true,
              key: config.key,
              range,
              count: range.length,
            };
            break;

          case 'sadd':
            // Add to set
            if (!config.members || config.members.length === 0) {
              throw new Error('Members are required for sadd operation');
            }
            
            const saddCount = await redis.sadd(config.key, ...config.members);
            result = {
              success: true,
              key: config.key,
              addedCount: saddCount,
            };
            break;

          case 'smembers':
            // Get set members
            const members = await redis.smembers(config.key);
            result = {
              success: true,
              key: config.key,
              members,
              count: members.length,
            };
            break;

          case 'srem':
            // Remove from set
            if (!config.members || config.members.length === 0) {
              throw new Error('Members are required for srem operation');
            }
            
            const sremCount = await redis.srem(config.key, ...config.members);
            result = {
              success: true,
              key: config.key,
              removedCount: sremCount,
            };
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } finally {
        redis.disconnect();
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
        error: error.message || 'Redis operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as RedisConfig;

    if (!config.connection?.host || !config.connection?.port) {
      return 'Redis connection details (host, port) are required';
    }

    if (!config.operation) {
      return 'Operation is required';
    }

    if (!config.key && !['keys'].includes(config.operation)) {
      return 'Key is required for this operation';
    }

    // Operation-specific validation
    if (['set', 'lpush', 'rpush'].includes(config.operation) && config.value === undefined) {
      return `Value is required for ${config.operation} operation`;
    }

    if (['hget', 'hset'].includes(config.operation) && !config.field) {
      return `Field is required for ${config.operation} operation`;
    }

    if (['sadd', 'srem'].includes(config.operation) && !config.members) {
      return `Members are required for ${config.operation} operation`;
    }

    return true;
  }
}
