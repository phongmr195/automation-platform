import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface BoxConfig {
  accessToken: string;
  operation: 'upload' | 'download' | 'list' | 'delete' | 'createFolder' | 'search' | 'getMetadata' | 'copy' | 'move';
  folderId?: string;
  fileId?: string;
  fileName?: string;
  content?: string;
  query?: string;
  destinationFolderId?: string;
  fields?: string[];
}

export class BoxNode implements INodeExecutor {
  private readonly BOX_API_BASE = 'https://api.box.com/2.0';

  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as BoxConfig;
      const operation = config.operation;

      const headers = {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      };

      let result: any;

      switch (operation) {
        case 'upload':
          // Upload file to Box
          if (!config.fileName) {
            throw new Error('File name is required for upload operation');
          }

          const folderId = config.folderId || '0'; // 0 is root folder
          const uploadFormData = new FormData();
          
          const fileBlob = new Blob([config.content || ''], { type: 'text/plain' });
          uploadFormData.append('file', fileBlob, config.fileName);
          uploadFormData.append('parent_id', folderId);

          const uploadResponse = await fetch(`https://upload.box.com/api/2.0/files/content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.accessToken}`,
            },
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Box upload failed: ${uploadResponse.statusText}`);
          }

          const uploadData = await uploadResponse.json();
          const uploadedFile = uploadData.entries?.[0];

          result = {
            success: true,
            id: uploadedFile?.id,
            name: uploadedFile?.name,
            size: uploadedFile?.size,
            createdAt: uploadedFile?.created_at,
            modifiedAt: uploadedFile?.modified_at,
            sharedLink: uploadedFile?.shared_link,
          };
          break;

        case 'download':
          // Download file from Box
          if (!config.fileId) {
            throw new Error('File ID is required for download operation');
          }

          const downloadResponse = await fetch(`${this.BOX_API_BASE}/files/${config.fileId}/content`, {
            headers,
          });

          if (!downloadResponse.ok) {
            throw new Error(`Box download failed: ${downloadResponse.statusText}`);
          }

          const content = await downloadResponse.text();

          result = {
            success: true,
            fileId: config.fileId,
            content,
          };
          break;

        case 'list':
          // List files in Box folder
          const listFolderId = config.folderId || '0';
          const fieldsParam = config.fields?.join(',') || 'id,name,type,size,created_at,modified_at';
          
          const listResponse = await fetch(
            `${this.BOX_API_BASE}/folders/${listFolderId}/items?fields=${fieldsParam}&limit=1000`,
            { headers }
          );

          if (!listResponse.ok) {
            throw new Error(`Box list failed: ${listResponse.statusText}`);
          }

          const listData = await listResponse.json();

          result = {
            success: true,
            folderId: listFolderId,
            items: listData.entries.map((item: any) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              size: item.size,
              createdAt: item.created_at,
              modifiedAt: item.modified_at,
              sharedLink: item.shared_link,
            })),
            count: listData.total_count,
          };
          break;

        case 'delete':
          // Delete file or folder from Box
          if (!config.fileId) {
            throw new Error('File ID is required for delete operation');
          }

          const deleteUrl = `${this.BOX_API_BASE}/files/${config.fileId}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers,
          });

          if (!deleteResponse.ok && deleteResponse.status !== 204) {
            throw new Error(`Box delete failed: ${deleteResponse.statusText}`);
          }

          result = {
            success: true,
            fileId: config.fileId,
            message: 'File deleted successfully',
          };
          break;

        case 'createFolder':
          // Create folder in Box
          if (!config.fileName) {
            throw new Error('Folder name is required for createFolder operation');
          }

          const parentFolderId = config.folderId || '0';
          const folderData = {
            name: config.fileName,
            parent: {
              id: parentFolderId,
            },
          };

          const folderResponse = await fetch(`${this.BOX_API_BASE}/folders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(folderData),
          });

          if (!folderResponse.ok) {
            throw new Error(`Box createFolder failed: ${folderResponse.statusText}`);
          }

          const folderResult = await folderResponse.json();

          result = {
            success: true,
            id: folderResult.id,
            name: folderResult.name,
            type: folderResult.type,
            createdAt: folderResult.created_at,
            modifiedAt: folderResult.modified_at,
          };
          break;

        case 'search':
          // Search files in Box
          if (!config.query) {
            throw new Error('Query is required for search operation');
          }

          const searchParams = new URLSearchParams({
            query: config.query,
            limit: '100',
            fields: config.fields?.join(',') || 'id,name,type,size,created_at,modified_at',
          });

          const searchResponse = await fetch(
            `${this.BOX_API_BASE}/search?${searchParams.toString()}`,
            { headers }
          );

          if (!searchResponse.ok) {
            throw new Error(`Box search failed: ${searchResponse.statusText}`);
          }

          const searchData = await searchResponse.json();

          result = {
            success: true,
            items: searchData.entries.map((item: any) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              size: item.size,
              createdAt: item.created_at,
              modifiedAt: item.modified_at,
            })),
            count: searchData.total_count,
            query: config.query,
          };
          break;

        case 'getMetadata':
          // Get file/folder metadata
          if (!config.fileId) {
            throw new Error('File ID is required for getMetadata operation');
          }

          const metadataResponse = await fetch(
            `${this.BOX_API_BASE}/files/${config.fileId}`,
            { headers }
          );

          if (!metadataResponse.ok) {
            throw new Error(`Box getMetadata failed: ${metadataResponse.statusText}`);
          }

          const metadata = await metadataResponse.json();

          result = {
            success: true,
            id: metadata.id,
            name: metadata.name,
            type: metadata.type,
            size: metadata.size,
            createdAt: metadata.created_at,
            modifiedAt: metadata.modified_at,
            description: metadata.description,
            parent: metadata.parent,
            pathCollection: metadata.path_collection,
            createdBy: metadata.created_by,
            modifiedBy: metadata.modified_by,
            sharedLink: metadata.shared_link,
          };
          break;

        case 'copy':
          // Copy file in Box
          if (!config.fileId || !config.destinationFolderId) {
            throw new Error('File ID and destination folder ID are required for copy operation');
          }

          const copyData = {
            parent: {
              id: config.destinationFolderId,
            },
            ...(config.fileName && { name: config.fileName }),
          };

          const copyResponse = await fetch(
            `${this.BOX_API_BASE}/files/${config.fileId}/copy`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(copyData),
            }
          );

          if (!copyResponse.ok) {
            throw new Error(`Box copy failed: ${copyResponse.statusText}`);
          }

          const copyResult = await copyResponse.json();

          result = {
            success: true,
            id: copyResult.id,
            name: copyResult.name,
            type: copyResult.type,
            size: copyResult.size,
            parent: copyResult.parent,
          };
          break;

        case 'move':
          // Move file in Box
          if (!config.fileId || !config.destinationFolderId) {
            throw new Error('File ID and destination folder ID are required for move operation');
          }

          const moveData = {
            parent: {
              id: config.destinationFolderId,
            },
            ...(config.fileName && { name: config.fileName }),
          };

          const moveResponse = await fetch(
            `${this.BOX_API_BASE}/files/${config.fileId}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify(moveData),
            }
          );

          if (!moveResponse.ok) {
            throw new Error(`Box move failed: ${moveResponse.statusText}`);
          }

          const moveResult = await moveResponse.json();

          result = {
            success: true,
            id: moveResult.id,
            name: moveResult.name,
            type: moveResult.type,
            size: moveResult.size,
            parent: moveResult.parent,
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
        error: error.message || 'Box operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as BoxConfig;

    if (!config.accessToken) {
      return 'Box access token is required';
    }

    if (!config.operation) {
      return 'Operation is required (upload, download, list, delete, createFolder, search, getMetadata, copy, move)';
    }

    const validOperations = ['upload', 'download', 'list', 'delete', 'createFolder', 'search', 'getMetadata', 'copy', 'move'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (['upload', 'createFolder'].includes(config.operation) && !config.fileName) {
      return `File/folder name is required for ${config.operation} operation`;
    }

    if (['download', 'delete', 'getMetadata'].includes(config.operation) && !config.fileId) {
      return `File ID is required for ${config.operation} operation`;
    }

    if (config.operation === 'search' && !config.query) {
      return 'Query is required for search operation';
    }

    if (['copy', 'move'].includes(config.operation) && (!config.fileId || !config.destinationFolderId)) {
      return `File ID and destination folder ID are required for ${config.operation} operation`;
    }

    return true;
  }
}
