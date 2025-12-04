import type { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

/**
 * Notion Node
 * Supports database queries, page creation, and block operations
 * Uses Notion API v1
 */
export const NotionNode: INodeExecutor = {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const { operation, connection, databaseId, pageId, blockId, properties, children, filter, sorts, query, pageSize } = node.data.parameters;

    try {
      // Validate required parameters
      if (!operation) {
        throw new Error('Operation is required (queryDatabase, createPage, updatePage, getPage, appendBlock, getBlocks, search)');
      }

      if (!connection || !connection.token) {
        throw new Error('Notion integration token is required');
      }

      // Import Notion client
      const { Client } = await import('@notionhq/client');
      
      const notion = new Client({ auth: connection.token });

      let result: any;

      switch (operation) {
        case 'queryDatabase': {
          if (!databaseId) {
            throw new Error('Database ID is required for queryDatabase operation');
          }

          const queryParams: any = { database_id: databaseId };
          
          if (filter) {
            queryParams.filter = typeof filter === 'string' ? JSON.parse(filter) : filter;
          }
          
          if (sorts) {
            queryParams.sorts = typeof sorts === 'string' ? JSON.parse(sorts) : sorts;
          }

          const response = await (notion.databases as any).query(queryParams);

          result = {
            results: response.results,
            hasMore: response.has_more,
            nextCursor: response.next_cursor,
          };
          break;
        }

        case 'createPage': {
          if (!databaseId && !pageId) {
            throw new Error('Either databaseId or pageId (parent) is required for createPage');
          }

          if (!properties) {
            throw new Error('Properties are required for createPage operation');
          }

          const parsedProperties = typeof properties === 'string' 
            ? JSON.parse(properties) 
            : properties;

          const createParams: any = {
            parent: databaseId 
              ? { database_id: databaseId }
              : { page_id: pageId },
            properties: parsedProperties,
          };

          const response: any = await notion.pages.create(createParams);

          result = {
            id: response.id,
            url: response.url,
            createdTime: response.created_time,
            properties: response.properties,
          };
          break;
        }

        case 'updatePage': {
          if (!pageId) {
            throw new Error('Page ID is required for updatePage operation');
          }

          if (!properties) {
            throw new Error('Properties are required for updatePage operation');
          }

          const parsedProperties = typeof properties === 'string'
            ? JSON.parse(properties)
            : properties;

          const response: any = await notion.pages.update({
            page_id: pageId,
            properties: parsedProperties,
          });

          result = {
            id: response.id,
            lastEditedTime: response.last_edited_time,
            properties: response.properties,
          };
          break;
        }

        case 'getPage': {
          if (!pageId) {
            throw new Error('Page ID is required for getPage operation');
          }

          const response: any = await notion.pages.retrieve({ page_id: pageId });

          result = {
            id: response.id,
            createdTime: response.created_time,
            lastEditedTime: response.last_edited_time,
            properties: response.properties,
            url: (response as any).url,
          };
          break;
        }

        case 'appendBlock': {
          if (!pageId) {
            throw new Error('Page ID is required for appendBlock operation');
          }

          const { children } = node.data.parameters;
          
          if (!children) {
            throw new Error('Children (blocks) are required for appendBlock operation');
          }

          const parsedChildren = typeof children === 'string' 
            ? JSON.parse(children) 
            : children;

          const response = await notion.blocks.children.append({
            block_id: pageId,
            children: parsedChildren,
          });

          result = {
            results: response.results,
          };
          break;
        }

        case 'getBlocks': {
          if (!pageId) {
            throw new Error('Page/Block ID is required for getBlocks operation');
          }

          const response = await notion.blocks.children.list({
            block_id: pageId,
          });

          result = {
            results: response.results,
            hasMore: response.has_more,
            nextCursor: response.next_cursor,
          };
          break;
        }

        case 'search': {
          const { query, filterValue, sort } = node.data.parameters;

          const searchParams: any = {};
          
          if (query) {
            searchParams.query = query;
          }
          
          if (filterValue) {
            searchParams.filter = { value: filterValue, property: 'object' };
          }
          
          if (sort) {
            searchParams.sort = typeof sort === 'string' ? JSON.parse(sort) : sort;
          }

          const response = await notion.search(searchParams);

          result = {
            results: response.results,
            hasMore: response.has_more,
            nextCursor: response.next_cursor,
          };
          break;
        }

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Notion operation failed',
        duration: Date.now() - startTime,
      };
    }
  },

  validate(node: any): boolean | string {
    const { operation, connection, databaseId, pageId, blockId, properties, children, query } = node.data.parameters;

    if (!connection || !connection.token) {
      return 'Notion token is required';
    }

    if (!operation) {
      return 'Operation is required';
    }

    const validOperations = ['queryDatabase', 'createPage', 'updatePage', 'getPage', 'appendBlock', 'getBlocks', 'search'];
    if (!validOperations.includes(operation)) {
      return `Operation must be one of: ${validOperations.join(', ')}`;
    }

    // Validate operation-specific parameters
    if (operation === 'queryDatabase' && !databaseId) {
      return 'Database ID is required for queryDatabase operation';
    }

    if (operation === 'createPage' && (!databaseId || !properties)) {
      return 'Database ID and properties are required for createPage operation';
    }

    if (operation === 'updatePage' && (!pageId || !properties)) {
      return 'Page ID is required for updatePage operation';
    }

    if (operation === 'getPage' && !pageId) {
      return 'Page ID is required for getPage operation';
    }

    if (operation === 'appendBlock' && (!blockId || !children)) {
      return 'Block ID and children are required for appendBlock operation';
    }

    if (operation === 'getBlocks' && !blockId) {
      return 'Block ID is required for getBlocks operation';
    }

    if (operation === 'search' && !query) {
      return 'Search query is required for search operation';
    }

    return true;
  },
};
