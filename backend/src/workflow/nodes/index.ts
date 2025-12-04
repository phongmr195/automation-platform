/**
 * Workflow Nodes Registry
 * Register all available nodes here
 */

import { nodeRegistry } from '../NodeRegistry';
import { HttpRequestExecutor } from './HttpRequestNode';
import { LotteryPredictionExecutor } from './LotteryPredictionNode';
import { FootballResultsExecutor } from './FootballResultsNode';
import { TelegramSendExecutor } from './TelegramSendNode';
import { TransformExecutor } from './TransformNode';
import { ConditionExecutor } from './ConditionNode';
import { LoopExecutor } from './LoopNode';
import { DatabaseExecutor } from './DatabaseNode';

// Communication Nodes
import { EmailNode } from './EmailNode';
import { SlackNode } from './SlackNode';
import { DiscordNode } from './DiscordNode';
import { WebhookNode } from './WebhookNode';
import { SMSNode } from './SMSNode';

// Cloud Storage Nodes
import { GoogleDriveNode } from './GoogleDriveNode';
import { DropboxNode } from './DropboxNode';
import { AWSS3Node } from './AWSS3Node';
import { AzureBlobNode } from './AzureBlobNode';
import { OneDriveNode } from './OneDriveNode';
import { BoxNode } from './BoxNode';

/**
 * Initialize and register all nodes
 */
export function registerAllNodes(): void {
  // HTTP Request Node
  nodeRegistry.register({
    type: 'http-request',
    category: 'action',
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    executor: new HttpRequestExecutor(),
    inputs: [
      { name: 'url', type: 'string', required: true, description: 'Request URL' },
      { name: 'method', type: 'string', required: false, description: 'HTTP method (GET, POST, etc.)' },
      { name: 'headers', type: 'object', required: false, description: 'Request headers' },
      { name: 'body', type: 'object', required: false, description: 'Request body' },
    ],
    outputs: [
      { name: 'status', type: 'number', description: 'HTTP status code' },
      { name: 'data', type: 'any', description: 'Response data' },
    ],
  });

  // Lottery Prediction Node
  nodeRegistry.register({
    type: 'lottery-prediction',
    category: 'action',
    name: 'Lottery Prediction',
    description: 'Generate lottery predictions using AI',
    executor: new LotteryPredictionExecutor(),
    inputs: [
      { name: 'region', type: 'string', required: true, description: 'NORTH, CENTRAL, or SOUTH' },
      { name: 'provider', type: 'string', required: false, description: 'AI provider (groq, claude, gpt, gemini)' },
      { name: 'useAI', type: 'boolean', required: false, description: 'Use AI prediction (default: true)' },
    ],
    outputs: [
      { name: 'prediction', type: 'object', description: 'Lottery prediction result' },
      { name: 'provider', type: 'string', description: 'Provider used' },
    ],
  });

  // Football Results Node
  nodeRegistry.register({
    type: 'football-results',
    category: 'action',
    name: 'Football Results',
    description: 'Fetch football match results',
    executor: new FootballResultsExecutor(),
    inputs: [
      { name: 'operation', type: 'string', required: false, description: 'yesterday, specific-date, or league' },
      { name: 'date', type: 'string', required: false, description: 'Date for specific-date operation' },
      { name: 'league', type: 'string', required: false, description: 'League code for league operation' },
    ],
    outputs: [
      { name: 'results', type: 'array', description: 'Match results' },
    ],
  });

  // Telegram Send Node
  nodeRegistry.register({
    type: 'telegram-send',
    category: 'action',
    name: 'Telegram Send Message',
    description: 'Send messages to Telegram',
    executor: new TelegramSendExecutor(),
    inputs: [
      { name: 'message', type: 'string', required: true, description: 'Message to send' },
      { name: 'chatId', type: 'string', required: false, description: 'Chat ID (optional, uses env var)' },
      { name: 'parseMode', type: 'string', required: false, description: 'Parse mode (HTML or Markdown)' },
    ],
    outputs: [
      { name: 'messageId', type: 'number', description: 'Sent message ID' },
      { name: 'sent', type: 'boolean', description: 'Success status' },
    ],
  });

  // Transform Node
  nodeRegistry.register({
    type: 'transform',
    category: 'transform',
    name: 'Transform Data',
    description: 'Transform and manipulate data using JavaScript or mappings',
    executor: new TransformExecutor(),
    inputs: [
      { name: 'operation', type: 'string', required: true, description: 'code, map, extract, or format' },
      { name: 'code', type: 'string', required: false, description: 'JavaScript code for code operation' },
      { name: 'mapping', type: 'object', required: false, description: 'Field mappings for map operation' },
      { name: 'path', type: 'string', required: false, description: 'Path to extract for extract operation' },
      { name: 'template', type: 'string', required: false, description: 'Template string for format operation' },
    ],
    outputs: [
      { name: 'result', type: 'any', description: 'Transformed data' },
    ],
  });

  // Condition Node
  nodeRegistry.register({
    type: 'condition',
    category: 'logic',
    name: 'Condition (IF)',
    description: 'Route workflow based on conditions',
    executor: new ConditionExecutor(),
    inputs: [
      { name: 'conditions', type: 'array', required: true, description: 'Array of conditions to evaluate' },
      { name: 'defaultOutput', type: 'string', required: false, description: 'Default output if no condition matches' },
    ],
    outputs: [
      { name: 'matched', type: 'boolean', description: 'Whether a condition matched' },
      { name: 'output', type: 'string', description: 'Output branch name' },
    ],
  });

  // Loop Node
  nodeRegistry.register({
    type: 'loop',
    category: 'logic',
    name: 'Loop',
    description: 'Iterate over arrays',
    executor: new LoopExecutor(),
    inputs: [
      { name: 'operation', type: 'string', required: true, description: 'forEach, map, filter, reduce, find, some, every' },
      { name: 'items', type: 'array', required: false, description: 'Array to iterate (or use itemsPath)' },
      { name: 'itemsPath', type: 'string', required: false, description: 'Path to array in node data' },
      { name: 'mapExpression', type: 'string', required: false, description: 'Expression for map operation' },
      { name: 'filterExpression', type: 'string', required: false, description: 'Expression for filter operation' },
      { name: 'limit', type: 'number', required: false, description: 'Maximum items to process' },
    ],
    outputs: [
      { name: 'result', type: 'any', description: 'Loop result' },
      { name: 'itemCount', type: 'number', description: 'Number of items processed' },
    ],
  });

  // Database Node
  nodeRegistry.register({
    type: 'database',
    category: 'action',
    name: 'Database Query',
    description: 'Execute PostgreSQL database queries',
    executor: new DatabaseExecutor(),
    inputs: [
      { name: 'operation', type: 'string', required: true, description: 'findMany, findFirst, create, update, delete, count, raw' },
      { name: 'table', type: 'string', required: false, description: 'Table name (Prisma model)' },
      { name: 'query', type: 'string', required: false, description: 'Raw SQL query' },
      { name: 'data', type: 'object', required: false, description: 'Data for create/update' },
      { name: 'where', type: 'object', required: false, description: 'Where clause' },
    ],
    outputs: [
      { name: 'result', type: 'any', description: 'Query result' },
      { name: 'rowCount', type: 'number', description: 'Number of rows affected' },
    ],
  });

  // ==================== COMMUNICATION NODES ====================
  
  // Email Node
  nodeRegistry.register({
    type: 'email',
    category: 'communication',
    name: 'Send Email',
    description: 'Send emails via SMTP (Gmail, SendGrid, Mailgun, etc.)',
    executor: new EmailNode(),
    inputs: [
      { name: 'credentialId', type: 'string', required: false, description: 'Email credential ID (recommended)' },
      { name: 'smtp', type: 'object', required: false, description: 'SMTP configuration (if not using credential)', default: { host: 'smtp.gmail.com', port: 587, secure: false } },
      { name: 'from', type: 'string', required: true, description: 'Sender email address', placeholder: 'sender@example.com' },
      { name: 'to', type: 'string', required: true, description: 'Recipient email(s), comma-separated', placeholder: 'recipient@example.com' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject', placeholder: 'Your subject here' },
      { name: 'body', type: 'string', required: true, description: 'Email body content', placeholder: 'Your message here...' },
      { name: 'html', type: 'boolean', required: false, description: 'Send as HTML email', default: false },
      { name: 'cc', type: 'string', required: false, description: 'CC recipients (comma-separated)', placeholder: 'cc@example.com' },
      { name: 'bcc', type: 'string', required: false, description: 'BCC recipients (comma-separated)', placeholder: 'bcc@example.com' },
    ],
    outputs: [
      { name: 'messageId', type: 'string', description: 'Email message ID' },
      { name: 'accepted', type: 'array', description: 'Accepted recipients' },
    ],
  });

  // Slack Node
  nodeRegistry.register({
    type: 'slack',
    category: 'communication',
    name: 'Slack Message',
    description: 'Send messages to Slack channels via webhook',
    executor: new SlackNode(),
    inputs: [
      { name: 'credentialId', type: 'string', required: false, description: 'Slack credential ID (recommended)' },
      { name: 'webhookUrl', type: 'string', required: false, description: 'Slack webhook URL (if not using credential)', placeholder: 'https://hooks.slack.com/services/...' },
      { name: 'channel', type: 'string', required: false, description: 'Override channel (optional)', placeholder: '#general' },
      { name: 'text', type: 'string', required: true, description: 'Message text', placeholder: 'Hello from automation!' },
      { name: 'username', type: 'string', required: false, description: 'Bot display name', default: 'Automation Bot' },
      { name: 'icon_emoji', type: 'string', required: false, description: 'Bot emoji icon', default: ':robot_face:', placeholder: ':robot_face:' },
    ],
    outputs: [
      { name: 'status', type: 'number', description: 'Response status' },
      { name: 'sentTo', type: 'string', description: 'Channel sent to' },
    ],
  });

  // Discord Node
  nodeRegistry.register({
    type: 'discord',
    category: 'communication',
    name: 'Discord Message',
    description: 'Send messages to Discord channels via webhook',
    executor: new DiscordNode(),
    inputs: [
      { name: 'credentialId', type: 'string', required: false, description: 'Discord credential ID (recommended)' },
      { name: 'webhookUrl', type: 'string', required: false, description: 'Discord webhook URL (if not using credential)', placeholder: 'https://discord.com/api/webhooks/...' },
      { name: 'content', type: 'string', required: false, description: 'Simple message content', placeholder: 'Hello from automation!' },
      { name: 'username', type: 'string', required: false, description: 'Bot display name', default: 'Automation Bot' },
      { name: 'embeds', type: 'array', required: false, description: 'Rich embeds for formatted messages (advanced)' },
      { name: 'tts', type: 'boolean', required: false, description: 'Text-to-speech enabled', default: false },
    ],
    outputs: [
      { name: 'status', type: 'number', description: 'Response status' },
    ],
  });

  // Webhook Node
  nodeRegistry.register({
    type: 'webhook',
    category: 'communication',
    name: 'Webhook',
    description: 'Make HTTP webhook calls with authentication',
    executor: new WebhookNode(),
    inputs: [
      { name: 'method', type: 'string', required: true, description: 'HTTP method (GET, POST, PUT, PATCH, DELETE)', default: 'POST', placeholder: 'POST', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { name: 'url', type: 'string', required: true, description: 'Target webhook URL', placeholder: 'https://api.example.com/webhook' },
      { name: 'headers', type: 'object', required: false, description: 'Custom HTTP headers', default: {} },
      { name: 'queryParameters', type: 'object', required: false, description: 'URL query parameters', default: {} },
      { name: 'body', type: 'any', required: false, description: 'Request body (for POST/PUT/PATCH)' },
      { name: 'bodyType', type: 'string', required: false, description: 'Body format: json, form, or raw', default: 'json', options: ['json', 'form', 'raw'] },
      { name: 'authentication', type: 'object', required: false, description: 'Authentication (basic, bearer, apiKey)' },
      { name: 'timeout', type: 'number', required: false, description: 'Request timeout in milliseconds', default: 30000 },
      { name: 'followRedirect', type: 'boolean', required: false, description: 'Follow HTTP redirects', default: true },
      { name: 'ignoreSSL', type: 'boolean', required: false, description: 'Ignore SSL certificate errors', default: false },
    ],
    outputs: [
      { name: 'status', type: 'number', description: 'HTTP status code' },
      { name: 'body', type: 'any', description: 'Response body' },
      { name: 'headers', type: 'object', description: 'Response headers' },
    ],
  });

  // SMS Node
  nodeRegistry.register({
    type: 'sms',
    category: 'communication',
    name: 'Send SMS',
    description: 'Send SMS via Twilio, Vonage, or custom provider',
    executor: new SMSNode(),
    inputs: [
      { name: 'provider', type: 'string', required: true, description: 'SMS provider (twilio, vonage, or custom)', default: 'twilio', placeholder: 'twilio', options: ['twilio', 'vonage', 'custom'] },
      { name: 'credentialId', type: 'string', required: false, description: 'SMS provider credential ID (recommended)' },
      { name: 'from', type: 'string', required: true, description: 'Sender phone number (E.164 format)', placeholder: '+1234567890' },
      { name: 'to', type: 'string', required: true, description: 'Recipient phone number (E.164 format)', placeholder: '+0987654321' },
      { name: 'message', type: 'string', required: true, description: 'SMS message text (max 160 chars)', placeholder: 'Your message here' },
    ],
    outputs: [
      { name: 'messageId', type: 'string', description: 'Message ID' },
      { name: 'status', type: 'string', description: 'Delivery status' },
    ],
  });

  // ==================== CLOUD STORAGE NODES ====================

  // Google Drive Node
  nodeRegistry.register({
    type: 'google-drive',
    category: 'storage',
    name: 'Google Drive',
    description: 'Upload, download, list, and manage files in Google Drive',
    executor: new GoogleDriveNode(),
    inputs: [
      { name: 'credentials', type: 'object', required: true, description: 'Google service account credentials (clientEmail, privateKey)' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['upload', 'download', 'list', 'delete', 'createFolder', 'search'] },
      { name: 'fileId', type: 'string', required: false, description: 'File ID (for download/delete)', placeholder: '1abc...xyz' },
      { name: 'fileName', type: 'string', required: false, description: 'File name (for upload)', placeholder: 'document.txt' },
      { name: 'fileContent', type: 'string', required: false, description: 'File content (for upload)' },
      { name: 'folderId', type: 'string', required: false, description: 'Parent folder ID', placeholder: 'root' },
      { name: 'folderName', type: 'string', required: false, description: 'Folder name (for createFolder)', placeholder: 'New Folder' },
      { name: 'query', type: 'string', required: false, description: 'Search query (for search/list)', placeholder: "name contains 'document'" },
      { name: 'mimeType', type: 'string', required: false, description: 'MIME type', default: 'text/plain', placeholder: 'text/plain' },
      { name: 'fields', type: 'string', required: false, description: 'Fields to return', default: 'id, name, webViewLink, mimeType' },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Operation result' },
      { name: 'files', type: 'array', description: 'List of files (for list/search)' },
    ],
  });

  // Dropbox Node
  nodeRegistry.register({
    type: 'dropbox',
    category: 'storage',
    name: 'Dropbox',
    description: 'Upload, download, list, and manage files in Dropbox',
    executor: new DropboxNode(),
    inputs: [
      { name: 'accessToken', type: 'string', required: true, description: 'Dropbox access token' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['upload', 'download', 'list', 'delete', 'createFolder', 'search', 'getMetadata'] },
      { name: 'path', type: 'string', required: false, description: 'File/folder path', placeholder: '/documents/file.txt' },
      { name: 'content', type: 'string', required: false, description: 'File content (for upload)' },
      { name: 'query', type: 'string', required: false, description: 'Search query (for search)', placeholder: 'document' },
      { name: 'recursive', type: 'boolean', required: false, description: 'List recursively', default: false },
      { name: 'mode', type: 'string', required: false, description: 'Upload mode', default: 'add', options: ['add', 'overwrite', 'update'] },
      { name: 'autorename', type: 'boolean', required: false, description: 'Auto-rename on conflict', default: false },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Operation result' },
      { name: 'entries', type: 'array', description: 'List of entries (for list/search)' },
    ],
  });

  // AWS S3 Node
  nodeRegistry.register({
    type: 'aws-s3',
    category: 'storage',
    name: 'AWS S3',
    description: 'Upload, download, list, and manage objects in Amazon S3',
    executor: new AWSS3Node(),
    inputs: [
      { name: 'credentials', type: 'object', required: true, description: 'AWS credentials (accessKeyId, secretAccessKey, region)' },
      { name: 'bucket', type: 'string', required: true, description: 'S3 bucket name', placeholder: 'my-bucket' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['upload', 'download', 'list', 'delete', 'getMetadata', 'copy'] },
      { name: 'key', type: 'string', required: false, description: 'Object key (file path)', placeholder: 'folder/file.txt' },
      { name: 'content', type: 'string', required: false, description: 'File content (for upload)' },
      { name: 'contentType', type: 'string', required: false, description: 'Content type', default: 'text/plain', placeholder: 'text/plain' },
      { name: 'prefix', type: 'string', required: false, description: 'Prefix for listing', placeholder: 'folder/' },
      { name: 'maxKeys', type: 'number', required: false, description: 'Max objects to list', default: 1000 },
      { name: 'sourceBucket', type: 'string', required: false, description: 'Source bucket (for copy)', placeholder: 'source-bucket' },
      { name: 'sourceKey', type: 'string', required: false, description: 'Source key (for copy)', placeholder: 'source/file.txt' },
      { name: 'acl', type: 'string', required: false, description: 'Access control', default: 'private', options: ['private', 'public-read', 'public-read-write', 'authenticated-read'] },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Operation result' },
      { name: 'objects', type: 'array', description: 'List of objects (for list)' },
    ],
  });

  // Azure Blob Storage Node
  nodeRegistry.register({
    type: 'azure-blob',
    category: 'storage',
    name: 'Azure Blob Storage',
    description: 'Upload, download, list, and manage blobs in Azure Storage',
    executor: new AzureBlobNode(),
    inputs: [
      { name: 'connectionString', type: 'string', required: true, description: 'Azure Storage connection string' },
      { name: 'container', type: 'string', required: true, description: 'Container name', placeholder: 'my-container' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['upload', 'download', 'list', 'delete', 'getMetadata', 'copy'] },
      { name: 'blobName', type: 'string', required: false, description: 'Blob name (file path)', placeholder: 'folder/file.txt' },
      { name: 'content', type: 'string', required: false, description: 'Blob content (for upload)' },
      { name: 'contentType', type: 'string', required: false, description: 'Content type', default: 'text/plain', placeholder: 'text/plain' },
      { name: 'prefix', type: 'string', required: false, description: 'Prefix for listing', placeholder: 'folder/' },
      { name: 'maxResults', type: 'number', required: false, description: 'Max blobs to list', default: 1000 },
      { name: 'sourceContainer', type: 'string', required: false, description: 'Source container (for copy)', placeholder: 'source-container' },
      { name: 'sourceBlobName', type: 'string', required: false, description: 'Source blob (for copy)', placeholder: 'source/file.txt' },
      { name: 'tier', type: 'string', required: false, description: 'Access tier', options: ['Hot', 'Cool', 'Archive'] },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Operation result' },
      { name: 'blobs', type: 'array', description: 'List of blobs (for list)' },
    ],
  });

  // OneDrive Node
  nodeRegistry.register({
    type: 'onedrive',
    category: 'storage',
    name: 'OneDrive',
    description: 'Upload, download, list, and manage files in Microsoft OneDrive',
    executor: new OneDriveNode(),
    inputs: [
      { name: 'accessToken', type: 'string', required: true, description: 'Microsoft Graph API access token' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['upload', 'download', 'list', 'delete', 'createFolder', 'search', 'getMetadata'] },
      { name: 'path', type: 'string', required: false, description: 'File/folder path', placeholder: '/documents/file.txt' },
      { name: 'itemId', type: 'string', required: false, description: 'Item ID (alternative to path)', placeholder: '01ABC...XYZ' },
      { name: 'content', type: 'string', required: false, description: 'File content (for upload)' },
      { name: 'folderId', type: 'string', required: false, description: 'Parent folder ID', placeholder: 'root' },
      { name: 'query', type: 'string', required: false, description: 'Search query (for search)', placeholder: 'document' },
      { name: 'conflictBehavior', type: 'string', required: false, description: 'Conflict behavior', default: 'rename', options: ['rename', 'replace', 'fail'] },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Operation result' },
      { name: 'items', type: 'array', description: 'List of items (for list/search)' },
    ],
  });

  // Box Node
  nodeRegistry.register({
    type: 'box',
    category: 'storage',
    name: 'Box',
    description: 'Upload, download, list, and manage files in Box',
    executor: new BoxNode(),
    inputs: [
      { name: 'accessToken', type: 'string', required: true, description: 'Box access token' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['upload', 'download', 'list', 'delete', 'createFolder', 'search', 'getMetadata', 'copy', 'move'] },
      { name: 'folderId', type: 'string', required: false, description: 'Folder ID (0 = root)', default: '0', placeholder: '0' },
      { name: 'fileId', type: 'string', required: false, description: 'File ID', placeholder: '123456789' },
      { name: 'fileName', type: 'string', required: false, description: 'File/folder name', placeholder: 'document.txt' },
      { name: 'content', type: 'string', required: false, description: 'File content (for upload)' },
      { name: 'query', type: 'string', required: false, description: 'Search query (for search)', placeholder: 'document' },
      { name: 'destinationFolderId', type: 'string', required: false, description: 'Destination folder (for copy/move)', placeholder: '987654321' },
      { name: 'fields', type: 'array', required: false, description: 'Fields to return', default: ['id', 'name', 'type', 'size'] },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Operation result' },
      { name: 'items', type: 'array', description: 'List of items (for list/search)' },
    ],
  });

  console.log(`\n📦 Registered ${nodeRegistry.getAllNodes().length} workflow nodes`);
}

// Export all executors for testing
export {
  HttpRequestExecutor,
  LotteryPredictionExecutor,
  FootballResultsExecutor,
  TelegramSendExecutor,
  TransformExecutor,
  ConditionExecutor,
  LoopExecutor,
  DatabaseExecutor,
  // Communication Nodes
  EmailNode,
  SlackNode,
  DiscordNode,
  WebhookNode,
  SMSNode,
  // Cloud Storage Nodes
  GoogleDriveNode,
  DropboxNode,
  AWSS3Node,
  AzureBlobNode,
  OneDriveNode,
  BoxNode,
};
