import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface AzureBlobConfig {
  connectionString: string;
  operation: 'upload' | 'download' | 'list' | 'delete' | 'getMetadata' | 'copy';
  container: string;
  blobName?: string;
  content?: string;
  contentType?: string;
  prefix?: string;
  maxResults?: number;
  sourceContainer?: string;
  sourceBlobName?: string;
  tier?: 'Hot' | 'Cool' | 'Archive';
}

export class AzureBlobNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as AzureBlobConfig;
      const operation = config.operation;

      // Import Azure Storage Blob SDK dynamically
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
      const containerClient = blobServiceClient.getContainerClient(config.container);
      
      let result: any;

      switch (operation) {
        case 'upload':
          // Upload blob to Azure Storage
          if (!config.blobName) {
            throw new Error('Blob name is required for upload operation');
          }

          const blockBlobClient = containerClient.getBlockBlobClient(config.blobName);
          const uploadData = config.content || '';
          
          const uploadResponse = await blockBlobClient.upload(
            uploadData,
            Buffer.byteLength(uploadData),
            {
              blobHTTPHeaders: {
                blobContentType: config.contentType || 'text/plain',
              },
              tier: config.tier,
            }
          );

          result = {
            success: true,
            container: config.container,
            blobName: config.blobName,
            etag: uploadResponse.etag,
            lastModified: uploadResponse.lastModified,
            requestId: uploadResponse.requestId,
            url: blockBlobClient.url,
          };
          break;

        case 'download':
          // Download blob from Azure Storage
          if (!config.blobName) {
            throw new Error('Blob name is required for download operation');
          }

          const downloadBlobClient = containerClient.getBlobClient(config.blobName);
          const downloadResponse = await downloadBlobClient.download(0);
          
          // Convert stream to string
          const downloadedContent = await this.streamToString(downloadResponse.readableStreamBody);

          result = {
            success: true,
            container: config.container,
            blobName: config.blobName,
            content: downloadedContent,
            contentType: downloadResponse.contentType,
            contentLength: downloadResponse.contentLength,
            lastModified: downloadResponse.lastModified,
            etag: downloadResponse.etag,
          };
          break;

        case 'list':
          // List blobs in Azure Storage container
          const blobs: any[] = [];
          
          for await (const blob of containerClient.listBlobsFlat({
            prefix: config.prefix || '',
          })) {
            blobs.push({
              name: blob.name,
              contentType: blob.properties.contentType,
              contentLength: blob.properties.contentLength,
              lastModified: blob.properties.lastModified,
              etag: blob.properties.etag,
              tier: blob.properties.accessTier,
            });
            
            if (config.maxResults && blobs.length >= config.maxResults) {
              break;
            }
          }

          result = {
            success: true,
            container: config.container,
            blobs,
            count: blobs.length,
            prefix: config.prefix,
          };
          break;

        case 'delete':
          // Delete blob from Azure Storage
          if (!config.blobName) {
            throw new Error('Blob name is required for delete operation');
          }

          const deleteBlobClient = containerClient.getBlobClient(config.blobName);
          const deleteResponse = await deleteBlobClient.delete();

          result = {
            success: true,
            container: config.container,
            blobName: config.blobName,
            requestId: deleteResponse.requestId,
            message: 'Blob deleted successfully',
          };
          break;

        case 'getMetadata':
          // Get blob metadata from Azure Storage
          if (!config.blobName) {
            throw new Error('Blob name is required for getMetadata operation');
          }

          const metadataBlobClient = containerClient.getBlobClient(config.blobName);
          const properties = await metadataBlobClient.getProperties();

          result = {
            success: true,
            container: config.container,
            blobName: config.blobName,
            contentType: properties.contentType,
            contentLength: properties.contentLength,
            lastModified: properties.lastModified,
            etag: properties.etag,
            tier: properties.accessTier,
            metadata: properties.metadata,
            blobType: properties.blobType,
          };
          break;

        case 'copy':
          // Copy blob in Azure Storage
          if (!config.blobName || !config.sourceBlobName) {
            throw new Error('Both blobName (destination) and sourceBlobName are required for copy operation');
          }

          const sourceContainer = config.sourceContainer || config.container;
          const sourceContainerClient = blobServiceClient.getContainerClient(sourceContainer);
          const sourceBlobClient = sourceContainerClient.getBlobClient(config.sourceBlobName);
          
          const destBlobClient = containerClient.getBlobClient(config.blobName);
          
          const copyResponse = await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
          const copyResult = await copyResponse.pollUntilDone();

          result = {
            success: true,
            sourceContainer,
            sourceBlobName: config.sourceBlobName,
            destinationContainer: config.container,
            destinationBlobName: config.blobName,
            copyId: copyResult.copyId,
            copyStatus: copyResult.copyStatus,
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
        error: error.message || 'Azure Blob Storage operation failed',
        duration,
      };
    }
  }

  // Helper function to convert stream to string
  private async streamToString(readableStream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      readableStream.on('data', (data: any) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as AzureBlobConfig;

    if (!config.connectionString) {
      return 'Azure Storage connection string is required';
    }

    if (!config.container) {
      return 'Container name is required';
    }

    if (!config.operation) {
      return 'Operation is required (upload, download, list, delete, getMetadata, copy)';
    }

    const validOperations = ['upload', 'download', 'list', 'delete', 'getMetadata', 'copy'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (['upload', 'download', 'delete', 'getMetadata'].includes(config.operation) && !config.blobName) {
      return `Blob name is required for ${config.operation} operation`;
    }

    if (config.operation === 'copy' && (!config.blobName || !config.sourceBlobName)) {
      return 'Both blobName (destination) and sourceBlobName are required for copy operation';
    }

    return true;
  }
}
