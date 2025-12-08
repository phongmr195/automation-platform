import { Context, Next } from 'hono';
import { cacheService } from '../services/cacheService';

/**
 * Cache middleware for GET requests
 * Usage: router.get('/path', cacheMiddleware({ ttl: 300, keyPrefix: 'mykey' }), handler)
 */
export const cacheMiddleware = (options: {
  ttl?: number;
  keyPrefix?: string;
  keyGenerator?: (c: Context) => string;
}) => {
  return async (c: Context, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = options.keyGenerator
      ? options.keyGenerator(c)
      : `${options.keyPrefix || 'api'}:${c.req.url}`;

    // Try to get from cache
    const cached = await cacheService.get(key);
    if (cached) {
      return c.json(cached);
    }

    // Continue to handler
    await next();

    // Cache the response if successful
    const response = await c.res.clone().json();
    if (c.res.status === 200) {
      await cacheService.set(key, response, options.ttl);
    }
  };
};

/**
 * Generate cache key for workflows list
 */
export const workflowsListCacheKey = (c: Context): string => {
  const orgId = c.get('organizationId') as string;
  const params = new URLSearchParams(c.req.url.split('?')[1] || '');
  const search = params.get('search') || '';
  const status = params.get('status') || '';
  const starred = params.get('starred') || '';
  const folderId = params.get('folderId') || '';
  const sort = params.get('sort') || '';
  const order = params.get('order') || '';
  const page = params.get('page') || '1';
  const limit = params.get('limit') || '20';

  return `workflows:${orgId}:list:${search}:${status}:${starred}:${folderId}:${sort}:${order}:${page}:${limit}`;
};

/**
 * Generate cache key for single workflow
 */
export const workflowCacheKey = (workflowId: string): string => {
  return `workflow:${workflowId}`;
};

/**
 * Generate cache key for collaborators
 */
export const collaboratorsCacheKey = (workflowId: string): string => {
  return `collaborators:${workflowId}`;
};

/**
 * Generate cache key for comments
 */
export const commentsCacheKey = (c: Context): string => {
  const workflowId = c.req.param('workflowId');
  const params = new URLSearchParams(c.req.url.split('?')[1] || '');
  const nodeId = params.get('nodeId') || '';
  const page = params.get('page') || '1';
  
  return `comments:${workflowId}:${nodeId}:${page}`;
};

/**
 * Generate cache key for notifications
 */
export const notificationsCacheKey = (c: Context): string => {
  const userId = c.get('userId') as string;
  const params = new URLSearchParams(c.req.url.split('?')[1] || '');
  const workflowId = params.get('workflowId') || '';
  const read = params.get('read') || '';
  const page = params.get('page') || '1';
  
  return `notifications:${userId}:${workflowId}:${read}:${page}`;
};

/**
 * Generate cache key for templates
 */
export const templatesCacheKey = (c: Context): string => {
  const params = new URLSearchParams(c.req.url.split('?')[1] || '');
  const category = params.get('category') || '';
  const search = params.get('search') || '';
  const featured = params.get('featured') || '';
  const sort = params.get('sort') || '';
  const page = params.get('page') || '1';
  
  return `templates:${category}:${search}:${featured}:${sort}:${page}`;
};
