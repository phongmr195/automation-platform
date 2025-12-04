import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface GoogleDriveConfig {
  credentials: {
    clientEmail: string;
    privateKey: string;
  };
  operation: 'upload' | 'download' | 'list' | 'delete' | 'createFolder' | 'search';
  fileId?: string;
  fileName?: string;
  filePath?: string;
  fileContent?: string;
  folderId?: string;
  folderName?: string;
  query?: string;
  mimeType?: string;
  fields?: string;
}

export class GoogleDriveNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as GoogleDriveConfig;
      const operation = config.operation;

      // Import Google APIs dynamically
      const { google } = await import('googleapis');
      
      // Setup OAuth2 client with service account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.credentials.clientEmail,
          private_key: config.credentials.privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });
      let result: any;

      switch (operation) {
        case 'upload':
          // Upload file to Google Drive
          const fileMetadata = {
            name: config.fileName || 'Untitled',
            ...(config.folderId && { parents: [config.folderId] }),
          };

          const media = {
            mimeType: config.mimeType || 'text/plain',
            body: config.fileContent || '',
          };

          const uploadResponse = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: config.fields || 'id, name, webViewLink, mimeType',
          });

          result = {
            success: true,
            fileId: uploadResponse.data.id,
            fileName: uploadResponse.data.name,
            webViewLink: uploadResponse.data.webViewLink,
            mimeType: uploadResponse.data.mimeType,
          };
          break;

        case 'download':
          // Download file from Google Drive
          if (!config.fileId) {
            throw new Error('File ID is required for download operation');
          }

          const downloadResponse = await drive.files.get({
            fileId: config.fileId,
            alt: 'media',
          }, { responseType: 'text' });

          result = {
            success: true,
            fileId: config.fileId,
            content: downloadResponse.data,
          };
          break;

        case 'list':
          // List files in Google Drive
          const listQuery = config.query || `'${config.folderId || 'root'}' in parents and trashed=false`;
          
          const listResponse = await drive.files.list({
            q: listQuery,
            fields: config.fields || 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
            pageSize: 100,
          });

          result = {
            success: true,
            files: listResponse.data.files || [],
            count: listResponse.data.files?.length || 0,
          };
          break;

        case 'delete':
          // Delete file from Google Drive
          if (!config.fileId) {
            throw new Error('File ID is required for delete operation');
          }

          await drive.files.delete({
            fileId: config.fileId,
          });

          result = {
            success: true,
            fileId: config.fileId,
            message: 'File deleted successfully',
          };
          break;

        case 'createFolder':
          // Create folder in Google Drive
          const folderMetadata = {
            name: config.folderName || 'New Folder',
            mimeType: 'application/vnd.google-apps.folder',
            ...(config.folderId && { parents: [config.folderId] }),
          };

          const folderResponse = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id, name, webViewLink',
          });

          result = {
            success: true,
            folderId: folderResponse.data.id,
            folderName: folderResponse.data.name,
            webViewLink: folderResponse.data.webViewLink,
          };
          break;

        case 'search':
          // Search files in Google Drive
          if (!config.query) {
            throw new Error('Query is required for search operation');
          }

          const searchResponse = await drive.files.list({
            q: config.query,
            fields: config.fields || 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
            pageSize: 100,
          });

          result = {
            success: true,
            files: searchResponse.data.files || [],
            count: searchResponse.data.files?.length || 0,
            query: config.query,
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
        error: error.message || 'Google Drive operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as GoogleDriveConfig;

    if (!config.credentials?.clientEmail || !config.credentials?.privateKey) {
      return 'Google Drive credentials (clientEmail and privateKey) are required';
    }

    if (!config.operation) {
      return 'Operation is required (upload, download, list, delete, createFolder, search)';
    }

    const validOperations = ['upload', 'download', 'list', 'delete', 'createFolder', 'search'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (config.operation === 'download' && !config.fileId) {
      return 'File ID is required for download operation';
    }

    if (config.operation === 'delete' && !config.fileId) {
      return 'File ID is required for delete operation';
    }

    if (config.operation === 'search' && !config.query) {
      return 'Query is required for search operation';
    }

    return true;
  }
}
