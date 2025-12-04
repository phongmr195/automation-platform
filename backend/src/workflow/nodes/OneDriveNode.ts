import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface OneDriveConfig {
  accessToken: string;
  operation: 'upload' | 'download' | 'list' | 'delete' | 'createFolder' | 'search' | 'getMetadata';
  path?: string;
  content?: string;
  folderId?: string;
  itemId?: string;
  query?: string;
  conflictBehavior?: 'rename' | 'replace' | 'fail';
}

export class OneDriveNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as OneDriveConfig;
      const operation = config.operation;

      // Import Microsoft Graph Client dynamically
      const { Client } = await import('@microsoft/microsoft-graph-client');
      
      const client = Client.init({
        authProvider: (done) => {
          done(null, config.accessToken);
        },
      });

      let result: any;

      switch (operation) {
        case 'upload':
          // Upload file to OneDrive
          if (!config.path) {
            throw new Error('Path is required for upload operation');
          }

          const uploadPath = `/me/drive/root:/${config.path}:/content`;
          const uploadResponse = await client
            .api(uploadPath)
            .put(config.content || '');

          result = {
            success: true,
            id: uploadResponse.id,
            name: uploadResponse.name,
            size: uploadResponse.size,
            webUrl: uploadResponse.webUrl,
            downloadUrl: uploadResponse['@microsoft.graph.downloadUrl'],
            createdDateTime: uploadResponse.createdDateTime,
            lastModifiedDateTime: uploadResponse.lastModifiedDateTime,
          };
          break;

        case 'download':
          // Download file from OneDrive
          const downloadPath = config.itemId 
            ? `/me/drive/items/${config.itemId}/content`
            : `/me/drive/root:/${config.path}:/content`;

          const downloadResponse = await client
            .api(downloadPath)
            .get();

          result = {
            success: true,
            content: downloadResponse,
            path: config.path,
            itemId: config.itemId,
          };
          break;

        case 'list':
          // List files in OneDrive folder
          const listPath = config.itemId
            ? `/me/drive/items/${config.itemId}/children`
            : config.path
              ? `/me/drive/root:/${config.path}:/children`
              : '/me/drive/root/children';

          const listResponse = await client
            .api(listPath)
            .get();

          result = {
            success: true,
            items: listResponse.value.map((item: any) => ({
              id: item.id,
              name: item.name,
              size: item.size,
              type: item.folder ? 'folder' : 'file',
              webUrl: item.webUrl,
              downloadUrl: item['@microsoft.graph.downloadUrl'],
              createdDateTime: item.createdDateTime,
              lastModifiedDateTime: item.lastModifiedDateTime,
              mimeType: item.file?.mimeType,
            })),
            count: listResponse.value.length,
          };
          break;

        case 'delete':
          // Delete file or folder from OneDrive
          const deletePath = config.itemId
            ? `/me/drive/items/${config.itemId}`
            : `/me/drive/root:/${config.path}`;

          await client
            .api(deletePath)
            .delete();

          result = {
            success: true,
            path: config.path,
            itemId: config.itemId,
            message: 'Item deleted successfully',
          };
          break;

        case 'createFolder':
          // Create folder in OneDrive
          if (!config.path) {
            throw new Error('Path is required for createFolder operation');
          }

          const parentPath = config.folderId
            ? `/me/drive/items/${config.folderId}/children`
            : '/me/drive/root/children';

          const folderData = {
            name: config.path.split('/').pop() || 'New Folder',
            folder: {},
            '@microsoft.graph.conflictBehavior': config.conflictBehavior || 'rename',
          };

          const folderResponse = await client
            .api(parentPath)
            .post(folderData);

          result = {
            success: true,
            id: folderResponse.id,
            name: folderResponse.name,
            webUrl: folderResponse.webUrl,
            createdDateTime: folderResponse.createdDateTime,
          };
          break;

        case 'search':
          // Search files in OneDrive
          if (!config.query) {
            throw new Error('Query is required for search operation');
          }

          const searchResponse = await client
            .api('/me/drive/root/search(q=\'{query}\')')
            .query({ q: config.query })
            .get();

          result = {
            success: true,
            items: searchResponse.value.map((item: any) => ({
              id: item.id,
              name: item.name,
              path: item.parentReference?.path,
              size: item.size,
              type: item.folder ? 'folder' : 'file',
              webUrl: item.webUrl,
              downloadUrl: item['@microsoft.graph.downloadUrl'],
              lastModifiedDateTime: item.lastModifiedDateTime,
            })),
            count: searchResponse.value.length,
            query: config.query,
          };
          break;

        case 'getMetadata':
          // Get file/folder metadata
          const metadataPath = config.itemId
            ? `/me/drive/items/${config.itemId}`
            : `/me/drive/root:/${config.path}`;

          const metadataResponse = await client
            .api(metadataPath)
            .get();

          result = {
            success: true,
            id: metadataResponse.id,
            name: metadataResponse.name,
            size: metadataResponse.size,
            type: metadataResponse.folder ? 'folder' : 'file',
            webUrl: metadataResponse.webUrl,
            downloadUrl: metadataResponse['@microsoft.graph.downloadUrl'],
            createdDateTime: metadataResponse.createdDateTime,
            lastModifiedDateTime: metadataResponse.lastModifiedDateTime,
            createdBy: metadataResponse.createdBy?.user?.displayName,
            lastModifiedBy: metadataResponse.lastModifiedBy?.user?.displayName,
            mimeType: metadataResponse.file?.mimeType,
            parentReference: metadataResponse.parentReference,
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
        error: error.message || 'OneDrive operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as OneDriveConfig;

    if (!config.accessToken) {
      return 'OneDrive access token is required';
    }

    if (!config.operation) {
      return 'Operation is required (upload, download, list, delete, createFolder, search, getMetadata)';
    }

    const validOperations = ['upload', 'download', 'list', 'delete', 'createFolder', 'search', 'getMetadata'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (['upload', 'createFolder'].includes(config.operation) && !config.path) {
      return `Path is required for ${config.operation} operation`;
    }

    if (['download', 'delete', 'getMetadata'].includes(config.operation) && !config.path && !config.itemId) {
      return `Either path or itemId is required for ${config.operation} operation`;
    }

    if (config.operation === 'search' && !config.query) {
      return 'Query is required for search operation';
    }

    return true;
  }
}
