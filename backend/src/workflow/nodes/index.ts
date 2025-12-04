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

// Database Nodes
import { MySQLNode } from './MySQLNode';
import { MongoDBNode } from './MongoDBNode';
import { RedisNode } from './RedisNode';
import { AirtableNode } from './AirtableNode';
import { FirebaseNode } from './FirebaseNode';

// Productivity Nodes
import { GoogleSheetsNode } from './GoogleSheetsNode';
import { NotionNode } from './NotionNode';
import { TrelloNode } from './TrelloNode';

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

  // ==================== DATABASE NODES ====================

  // MySQL Node
  nodeRegistry.register({
    type: 'mysql',
    category: 'database',
    name: 'MySQL',
    description: 'Execute MySQL database queries',
    executor: new MySQLNode(),
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'MySQL connection details (host, port, user, password, database)' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'query', options: ['query', 'select', 'insert', 'update', 'delete'] },
      { name: 'query', type: 'string', required: false, description: 'Raw SQL query (for query operation)' },
      { name: 'table', type: 'string', required: false, description: 'Table name', placeholder: 'users' },
      { name: 'columns', type: 'array', required: false, description: 'Columns to select', placeholder: ['id', 'name', 'email'] },
      { name: 'data', type: 'object', required: false, description: 'Data for insert/update' },
      { name: 'where', type: 'object', required: false, description: 'Where clause', placeholder: { id: 1 } },
      { name: 'limit', type: 'number', required: false, description: 'Limit results' },
      { name: 'offset', type: 'number', required: false, description: 'Offset results' },
    ],
    outputs: [
      { name: 'rows', type: 'array', description: 'Query results' },
      { name: 'rowCount', type: 'number', description: 'Number of rows' },
      { name: 'affectedRows', type: 'number', description: 'Affected rows (for insert/update/delete)' },
    ],
  });

  // MongoDB Node
  nodeRegistry.register({
    type: 'mongodb',
    category: 'database',
    name: 'MongoDB',
    description: 'Execute MongoDB database operations',
    executor: new MongoDBNode(),
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'MongoDB connection details (uri, database)' },
      { name: 'collection', type: 'string', required: true, description: 'Collection name', placeholder: 'users' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'find', options: ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate', 'count'] },
      { name: 'filter', type: 'object', required: false, description: 'Query filter', placeholder: { age: { $gte: 18 } } },
      { name: 'document', type: 'object', required: false, description: 'Document for insertOne' },
      { name: 'documents', type: 'array', required: false, description: 'Documents for insertMany' },
      { name: 'update', type: 'object', required: false, description: 'Update operation', placeholder: { $set: { name: 'John' } } },
      { name: 'projection', type: 'object', required: false, description: 'Fields to return', placeholder: { name: 1, email: 1 } },
      { name: 'sort', type: 'object', required: false, description: 'Sort order', placeholder: { createdAt: -1 } },
      { name: 'limit', type: 'number', required: false, description: 'Limit results' },
      { name: 'skip', type: 'number', required: false, description: 'Skip documents' },
      { name: 'pipeline', type: 'array', required: false, description: 'Aggregation pipeline' },
    ],
    outputs: [
      { name: 'documents', type: 'array', description: 'Found documents' },
      { name: 'document', type: 'object', description: 'Found document (findOne)' },
      { name: 'count', type: 'number', description: 'Document count' },
      { name: 'insertedId', type: 'string', description: 'Inserted document ID' },
      { name: 'modifiedCount', type: 'number', description: 'Modified documents count' },
      { name: 'deletedCount', type: 'number', description: 'Deleted documents count' },
    ],
  });

  // Redis Node
  nodeRegistry.register({
    type: 'redis',
    category: 'database',
    name: 'Redis',
    description: 'Execute Redis cache operations',
    executor: new RedisNode(),
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'Redis connection details (host, port, password, db)' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'get', options: ['get', 'set', 'del', 'exists', 'expire', 'ttl', 'keys', 'incr', 'decr', 'hget', 'hset', 'hgetall', 'lpush', 'rpush', 'lpop', 'rpop', 'lrange', 'sadd', 'smembers', 'srem'] },
      { name: 'key', type: 'string', required: true, description: 'Redis key', placeholder: 'user:123' },
      { name: 'value', type: 'string', required: false, description: 'Value to set' },
      { name: 'field', type: 'string', required: false, description: 'Hash field name' },
      { name: 'members', type: 'array', required: false, description: 'Set members' },
      { name: 'ttl', type: 'number', required: false, description: 'Time to live (seconds)' },
      { name: 'pattern', type: 'string', required: false, description: 'Key pattern (for keys operation)', placeholder: 'user:*' },
      { name: 'start', type: 'number', required: false, description: 'List range start' },
      { name: 'stop', type: 'number', required: false, description: 'List range stop' },
    ],
    outputs: [
      { name: 'value', type: 'string', description: 'Retrieved value' },
      { name: 'exists', type: 'boolean', description: 'Key existence' },
      { name: 'keys', type: 'array', description: 'Found keys' },
      { name: 'hash', type: 'object', description: 'Hash object' },
      { name: 'members', type: 'array', description: 'Set members' },
      { name: 'range', type: 'array', description: 'List range' },
    ],
  });

  // Airtable Node
  nodeRegistry.register({
    type: 'airtable',
    category: 'database',
    name: 'Airtable',
    description: 'Manage Airtable records',
    executor: new AirtableNode(),
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'Airtable connection (apiKey, baseId)' },
      { name: 'table', type: 'string', required: true, description: 'Table name', placeholder: 'Users' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'list', options: ['list', 'get', 'create', 'update', 'delete', 'query'] },
      { name: 'recordId', type: 'string', required: false, description: 'Record ID', placeholder: 'recXXXXXXXXXXXXXX' },
      { name: 'fields', type: 'object', required: false, description: 'Record fields' },
      { name: 'filterByFormula', type: 'string', required: false, description: 'Filter formula', placeholder: '{Status} = "Active"' },
      { name: 'sort', type: 'array', required: false, description: 'Sort configuration', placeholder: [{ field: 'Name', direction: 'asc' }] },
      { name: 'maxRecords', type: 'number', required: false, description: 'Maximum records to return' },
      { name: 'pageSize', type: 'number', required: false, description: 'Page size' },
      { name: 'view', type: 'string', required: false, description: 'View name' },
    ],
    outputs: [
      { name: 'records', type: 'array', description: 'List of records' },
      { name: 'record', type: 'object', description: 'Single record' },
      { name: 'count', type: 'number', description: 'Record count' },
    ],
  });

  // Firebase Node
  nodeRegistry.register({
    type: 'firebase',
    category: 'database',
    name: 'Firebase Firestore',
    description: 'Execute Firebase Firestore operations',
    executor: new FirebaseNode(),
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'Firebase connection (projectId, clientEmail, privateKey)' },
      { name: 'collection', type: 'string', required: true, description: 'Collection name', placeholder: 'users' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'get', options: ['get', 'set', 'add', 'update', 'delete', 'query'] },
      { name: 'documentId', type: 'string', required: false, description: 'Document ID', placeholder: 'user123' },
      { name: 'data', type: 'object', required: false, description: 'Document data' },
      { name: 'where', type: 'array', required: false, description: 'Query conditions', placeholder: [{ field: 'age', operator: '>=', value: 18 }] },
      { name: 'orderBy', type: 'object', required: false, description: 'Order by', placeholder: { field: 'createdAt', direction: 'desc' } },
      { name: 'limit', type: 'number', required: false, description: 'Limit results' },
      { name: 'offset', type: 'number', required: false, description: 'Offset results' },
    ],
    outputs: [
      { name: 'documents', type: 'array', description: 'List of documents' },
      { name: 'document', type: 'object', description: 'Single document' },
      { name: 'id', type: 'string', description: 'Document ID' },
      { name: 'count', type: 'number', description: 'Document count' },
    ],
  });

  // Google Sheets Node
  nodeRegistry.register({
    type: 'google-sheets',
    category: 'productivity',
    name: 'Google Sheets',
    description: 'Read and write data to Google Sheets using service account',
    executor: GoogleSheetsNode,
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'Service account credentials (clientEmail, privateKey)' },
      { name: 'spreadsheetId', type: 'string', required: true, description: 'Google Sheets spreadsheet ID' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'read', options: ['read', 'append', 'update', 'clear', 'batchUpdate', 'createSheet'] },
      { name: 'range', type: 'string', required: false, description: 'Range in A1 notation (e.g., Sheet1!A1:D10)' },
      { name: 'values', type: 'array', required: false, description: 'Values to write (2D array)' },
      { name: 'sheetName', type: 'string', required: false, description: 'Sheet name for createSheet operation' },
      { name: 'valueInputOption', type: 'string', required: false, description: 'How input data should be interpreted', default: 'USER_ENTERED', options: ['RAW', 'USER_ENTERED'] },
      { name: 'requests', type: 'array', required: false, description: 'Batch update requests' },
    ],
    outputs: [
      { name: 'values', type: 'array', description: 'Cell values' },
      { name: 'updatedCells', type: 'number', description: 'Number of cells updated' },
      { name: 'updatedRows', type: 'number', description: 'Number of rows updated' },
      { name: 'sheetId', type: 'number', description: 'Created sheet ID' },
    ],
  });

  // Notion Node
  nodeRegistry.register({
    type: 'notion',
    category: 'productivity',
    name: 'Notion',
    description: 'Interact with Notion databases and pages',
    executor: NotionNode,
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'Notion credentials (token)' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'queryDatabase', options: ['queryDatabase', 'createPage', 'updatePage', 'getPage', 'appendBlock', 'getBlocks', 'search'] },
      { name: 'databaseId', type: 'string', required: false, description: 'Database ID' },
      { name: 'pageId', type: 'string', required: false, description: 'Page ID' },
      { name: 'blockId', type: 'string', required: false, description: 'Block ID' },
      { name: 'properties', type: 'object', required: false, description: 'Page properties' },
      { name: 'children', type: 'array', required: false, description: 'Block content' },
      { name: 'filter', type: 'object', required: false, description: 'Query filter' },
      { name: 'sorts', type: 'array', required: false, description: 'Query sorts' },
      { name: 'query', type: 'string', required: false, description: 'Search query' },
      { name: 'pageSize', type: 'number', required: false, description: 'Results per page' },
    ],
    outputs: [
      { name: 'results', type: 'array', description: 'Query results' },
      { name: 'page', type: 'object', description: 'Page object' },
      { name: 'block', type: 'object', description: 'Block object' },
    ],
  });

  // Trello Node
  nodeRegistry.register({
    type: 'trello',
    category: 'productivity',
    name: 'Trello',
    description: 'Manage Trello boards, lists, and cards',
    executor: TrelloNode,
    inputs: [
      { name: 'connection', type: 'object', required: true, description: 'Trello credentials (apiKey, token)' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type', default: 'getBoard', options: ['getBoard', 'getLists', 'createList', 'getCards', 'createCard', 'updateCard', 'getCard', 'deleteCard', 'addComment', 'addChecklist'] },
      { name: 'boardId', type: 'string', required: false, description: 'Board ID' },
      { name: 'listId', type: 'string', required: false, description: 'List ID' },
      { name: 'cardId', type: 'string', required: false, description: 'Card ID' },
      { name: 'name', type: 'string', required: false, description: 'Name for create operations' },
      { name: 'desc', type: 'string', required: false, description: 'Description' },
      { name: 'pos', type: 'string', required: false, description: 'Position (top, bottom, or number)' },
      { name: 'due', type: 'string', required: false, description: 'Due date (ISO 8601)' },
      { name: 'text', type: 'string', required: false, description: 'Comment text' },
    ],
    outputs: [
      { name: 'board', type: 'object', description: 'Board object' },
      { name: 'lists', type: 'array', description: 'List objects' },
      { name: 'list', type: 'object', description: 'List object' },
      { name: 'cards', type: 'array', description: 'Card objects' },
      { name: 'card', type: 'object', description: 'Card object' },
      { name: 'comment', type: 'object', description: 'Comment object' },
      { name: 'checklist', type: 'object', description: 'Checklist object' },
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
  // Database Nodes
  MySQLNode,
  MongoDBNode,
  RedisNode,
  AirtableNode,
  FirebaseNode,
  // Productivity Nodes
  GoogleSheetsNode,
  NotionNode,
  TrelloNode,
};
