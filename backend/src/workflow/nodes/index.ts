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
};
