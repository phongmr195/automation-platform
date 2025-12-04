import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

interface AWSS3Config {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  operation: 'upload' | 'download' | 'list' | 'delete' | 'getMetadata' | 'copy';
  bucket: string;
  key?: string;
  content?: string;
  contentType?: string;
  prefix?: string;
  maxKeys?: number;
  sourceBucket?: string;
  sourceKey?: string;
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
}

export class AWSS3Node implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data.parameters as AWSS3Config;
      const operation = config.operation;

      // Import AWS SDK v3 dynamically
      const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, 
              DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: config.credentials.region,
        credentials: {
          accessKeyId: config.credentials.accessKeyId,
          secretAccessKey: config.credentials.secretAccessKey,
        },
      });

      let result: any;

      switch (operation) {
        case 'upload':
          // Upload file to S3
          if (!config.key) {
            throw new Error('Key (file path) is required for upload operation');
          }

          const uploadCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: config.key,
            Body: config.content || '',
            ContentType: config.contentType || 'text/plain',
            ACL: config.acl || 'private',
          });

          const uploadResponse = await s3Client.send(uploadCommand);

          result = {
            success: true,
            bucket: config.bucket,
            key: config.key,
            etag: uploadResponse.ETag,
            versionId: uploadResponse.VersionId,
            url: `https://${config.bucket}.s3.${config.credentials.region}.amazonaws.com/${config.key}`,
          };
          break;

        case 'download':
          // Download file from S3
          if (!config.key) {
            throw new Error('Key (file path) is required for download operation');
          }

          const downloadCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: config.key,
          });

          const downloadResponse = await s3Client.send(downloadCommand);
          
          // Convert stream to string
          const bodyContents = await downloadResponse.Body?.transformToString();

          result = {
            success: true,
            bucket: config.bucket,
            key: config.key,
            content: bodyContents,
            contentType: downloadResponse.ContentType,
            contentLength: downloadResponse.ContentLength,
            lastModified: downloadResponse.LastModified,
            etag: downloadResponse.ETag,
          };
          break;

        case 'list':
          // List objects in S3 bucket
          const listCommand = new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: config.prefix || '',
            MaxKeys: config.maxKeys || 1000,
          });

          const listResponse = await s3Client.send(listCommand);

          result = {
            success: true,
            bucket: config.bucket,
            objects: (listResponse.Contents || []).map(obj => ({
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified,
              etag: obj.ETag,
              storageClass: obj.StorageClass,
            })),
            count: listResponse.KeyCount || 0,
            isTruncated: listResponse.IsTruncated,
            prefix: config.prefix,
          };
          break;

        case 'delete':
          // Delete object from S3
          if (!config.key) {
            throw new Error('Key (file path) is required for delete operation');
          }

          const deleteCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: config.key,
          });

          const deleteResponse = await s3Client.send(deleteCommand);

          result = {
            success: true,
            bucket: config.bucket,
            key: config.key,
            deleteMarker: deleteResponse.DeleteMarker,
            versionId: deleteResponse.VersionId,
            message: 'Object deleted successfully',
          };
          break;

        case 'getMetadata':
          // Get object metadata from S3
          if (!config.key) {
            throw new Error('Key (file path) is required for getMetadata operation');
          }

          const metadataCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: config.key,
          });

          const metadataResponse = await s3Client.send(metadataCommand);

          result = {
            success: true,
            bucket: config.bucket,
            key: config.key,
            contentType: metadataResponse.ContentType,
            contentLength: metadataResponse.ContentLength,
            lastModified: metadataResponse.LastModified,
            etag: metadataResponse.ETag,
            versionId: metadataResponse.VersionId,
            metadata: metadataResponse.Metadata,
            storageClass: metadataResponse.StorageClass,
          };
          break;

        case 'copy':
          // Copy object in S3
          if (!config.key || !config.sourceKey) {
            throw new Error('Both key (destination) and sourceKey are required for copy operation');
          }

          const sourceBucket = config.sourceBucket || config.bucket;
          const copySource = `${sourceBucket}/${config.sourceKey}`;

          const copyCommand = new CopyObjectCommand({
            Bucket: config.bucket,
            Key: config.key,
            CopySource: copySource,
            ACL: config.acl || 'private',
          });

          const copyResponse = await s3Client.send(copyCommand);

          result = {
            success: true,
            sourceBucket,
            sourceKey: config.sourceKey,
            destinationBucket: config.bucket,
            destinationKey: config.key,
            etag: copyResponse.CopyObjectResult?.ETag,
            lastModified: copyResponse.CopyObjectResult?.LastModified,
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
        error: error.message || 'AWS S3 operation failed',
        duration,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const config = node.data.parameters as AWSS3Config;

    if (!config.credentials?.accessKeyId || !config.credentials?.secretAccessKey || !config.credentials?.region) {
      return 'AWS credentials (accessKeyId, secretAccessKey, region) are required';
    }

    if (!config.bucket) {
      return 'S3 bucket name is required';
    }

    if (!config.operation) {
      return 'Operation is required (upload, download, list, delete, getMetadata, copy)';
    }

    const validOperations = ['upload', 'download', 'list', 'delete', 'getMetadata', 'copy'];
    if (!validOperations.includes(config.operation)) {
      return `Invalid operation. Must be one of: ${validOperations.join(', ')}`;
    }

    // Operation-specific validation
    if (['upload', 'download', 'delete', 'getMetadata'].includes(config.operation) && !config.key) {
      return `Key (file path) is required for ${config.operation} operation`;
    }

    if (config.operation === 'copy' && (!config.key || !config.sourceKey)) {
      return 'Both key (destination) and sourceKey are required for copy operation';
    }

    return true;
  }
}
