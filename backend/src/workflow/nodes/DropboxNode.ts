import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface DropboxConfig {
  accessToken: string;
  operation: 'upload' | 'download' | 'list' | 'delete' | 'createFolder' | 'search' | 'getMetadata';
  path?: string;
  content?: string;
  query?: string;
  recursive?: boolean;
  mode?: 'add' | 'overwrite' | 'update';
  autorename?: boolean;
}

export class DropboxNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as DropboxConfig;
      const operation = config.operation;

      // Import Dropbox SDK dynamically
      const { Dropbox } = await import('dropbox');
      
      const dbx = new Dropbox({ accessToken: config.accessToken });
      let result: any;

      switch (operation) {
        case 'upload':
          // Upload file to Dropbox
          if (!config.path) {
            throw new Error('Path is required for upload operation');
          }

          const uploadResponse = await dbx.filesUpload({
            path: config.path,
            contents: config.content || '',
            mode: { '.tag': config.mode || 'add' },
            autorename: config.autorename || false,
          });

          result = {
            success: true,
            name: uploadResponse.result.name,
            path: uploadResponse.result.path_display,
            id: uploadResponse.result.id,
            size: uploadResponse.result.size,
            serverModified: uploadResponse.result.server_modified,
          };
          break;

        case 'download':
          // Download file from Dropbox
          if (!config.path) {
            throw new Error('Path is required for download operation');
          }

          const downloadResponse = await dbx.filesDownload({ path: config.path });
          
          // Extract file content (binary data is in fileBinary property)
          const fileBlob = (downloadResponse.result as any).fileBinary;
          let content: string;
          
          if (fileBlob) {
            // Convert blob to text
            content = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsText(fileBlob);
            });
          } else {
            content = '';
          }

          result = {
            success: true,
            name: downloadResponse.result.name,
            path: downloadResponse.result.path_display,
            size: downloadResponse.result.size,
            content: content,
            serverModified: downloadResponse.result.server_modified,
          };
          break;

        case 'list':
          // List files in Dropbox folder
          const listPath = config.path || '';
          
          const listResponse = await dbx.filesListFolder({
            path: listPath,
            recursive: config.recursive || false,
          });

          result = {
            success: true,
            entries: listResponse.result.entries.map((entry: any) => ({
              name: entry.name,
              path: entry.path_display,
              type: entry['.tag'],
              id: entry.id,
              size: entry.size,
              serverModified: entry.server_modified,
            })),
            count: listResponse.result.entries.length,
            hasMore: listResponse.result.has_more,
          };
          break;

        case 'delete':
          // Delete file or folder from Dropbox
          if (!config.path) {
            throw new Error('Path is required for delete operation');
          }

          const deleteResponse = await dbx.filesDeleteV2({ path: config.path });

          result = {
            success: true,
            path: config.path,
            metadata: deleteResponse.result.metadata,
            message: 'File/folder deleted successfully',
          };
          break;

        case 'createFolder':
          // Create folder in Dropbox
          if (!config.path) {
            throw new Error('Path is required for createFolder operation');
          }

          const folderResponse = await dbx.filesCreateFolderV2({
            path: config.path,
            autorename: config.autorename || false,
          });

          result = {
            success: true,
            name: folderResponse.result.metadata.name,
            path: folderResponse.result.metadata.path_display,
            id: folderResponse.result.metadata.id,
          };
          break;

        case 'search':
          // Search files in Dropbox
          if (!config.query) {
            throw new Error('Query is required for search operation');
          }

          const searchResponse = await dbx.filesSearchV2({
            query: config.query,
            options: {
              path: config.path || '',
              max_results: 100,
            },
          });

          result = {
            success: true,
            matches: searchResponse.result.matches.map((match: any) => ({
              name: match.metadata.metadata.name,
              path: match.metadata.metadata.path_display,
              type: match.metadata.metadata['.tag'],
              id: match.metadata.metadata.id,
            })),
            count: searchResponse.result.matches.length,
            hasMore: searchResponse.result.has_more,
          };
          break;

        case 'getMetadata':
          // Get file/folder metadata
          if (!config.path) {
            throw new Error('Path is required for getMetadata operation');
          }

          const metadataResponse = await dbx.filesGetMetadata({ path: config.path });

          result = {
            success: true,
            name: metadataResponse.result.name,
            path: metadataResponse.result.path_display,
            type: metadataResponse.result['.tag'],
            id: metadataResponse.result.id,
            size: (metadataResponse.result as any).size,
            serverModified: (metadataResponse.result as any).server_modified,
          };
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        duration,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message || 'Dropbox operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as DropboxConfig;

    if (!config.accessToken) {
      return 'Dropbox access token is required';
    }

    if (!config.operation) {
      return 'Operation is required (upload, download, list, delete, createFolder, search, getMetadata)';
    }

    const validOperations = ['upload', 'download', 'list', 'delete', 'createFolder', 'search', 'getMetadata'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (['upload', 'download', 'delete', 'createFolder', 'getMetadata'].includes(config.operation) && !config.path) {
      return `Path is required for ${config.operation} operation`;
    }

    if (config.operation === 'search' && !config.query) {
      return 'Query is required for search operation';
    }

    return true;
  }
}
