#!/usr/bin/env ts-node
/**
 * Test Workflow Engine
 * Quick test script for the new workflow engine
 */

import '../backend/src/workflow/index'; // Auto-register nodes
import { workflowExecutor } from '../backend/src/workflow/WorkflowExecutor';
import { nodeRegistry } from '../backend/src/workflow/NodeRegistry';
import type { Workflow } from '../backend/src/workflow/types';
import * as fs from 'fs';
import * as path from 'path';

async function testWorkflowEngine() {
  console.log('🧪 Testing Workflow Engine\n');

  // List registered nodes
  console.log('📦 Registered Nodes:');
  const nodes = nodeRegistry.getAllNodes();
  nodes.forEach(node => {
    console.log(`  - ${node.type} (${node.name})`);
  });
  console.log('');

  // Test 1: Simple Lottery Prediction Workflow
  console.log('🎯 Test 1: Lottery Prediction Workflow');
  const lotteryWorkflow: Workflow = {
    id: 'test_lottery',
    name: 'Test Lottery Prediction',
    description: 'Test lottery prediction with Groq',
    nodes: [
      {
        id: 'lottery-1',
        name: 'Predict NORTH',
        type: 'action',
        position: { x: 0, y: 0 },
        data: {
          service: 'lottery-prediction',
          operation: 'predict',
          parameters: {
            region: 'NORTH',
            provider: 'groq',
            useAI: true,
          },
        },
      },
    ],
    connections: [],
    triggers: [{ type: 'manual', config: {} }],
    settings: {},
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const result1 = await workflowExecutor.execute(lotteryWorkflow);
    console.log(`✅ Status: ${result1.status}`);
    console.log(`⏱️  Duration: ${result1.duration}ms\n`);
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: Football Results Workflow
  console.log('🎯 Test 2: Football Results Workflow');
  const footballWorkflow: Workflow = {
    id: 'test_football',
    name: 'Test Football Results',
    description: 'Test football results fetch',
    nodes: [
      {
        id: 'football-1',
        name: 'Fetch Results',
        type: 'action',
        position: { x: 0, y: 0 },
        data: {
          service: 'football-results',
          operation: 'fetch',
          parameters: {
            operation: 'yesterday',
          },
        },
      },
    ],
    connections: [],
    triggers: [{ type: 'manual', config: {} }],
    settings: {},
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const result2 = await workflowExecutor.execute(footballWorkflow);
    console.log(`✅ Status: ${result2.status}`);
    console.log(`⏱️  Duration: ${result2.duration}ms\n`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  // Test 3: Multi-node workflow with connection
  console.log('🎯 Test 3: Multi-node Workflow (Football → Telegram)');
  const multiNodeWorkflow: Workflow = {
    id: 'test_multi',
    name: 'Football to Telegram',
    description: 'Fetch football results and send to Telegram',
    nodes: [
      {
        id: 'node-1',
        name: 'Fetch Football',
        type: 'action',
        position: { x: 0, y: 0 },
        data: {
          service: 'football-results',
          operation: 'fetch',
          parameters: {
            operation: 'yesterday',
          },
        },
      },
      {
        id: 'node-2',
        name: 'Send to Telegram',
        type: 'action',
        position: { x: 200, y: 0 },
        data: {
          service: 'telegram-send',
          operation: 'send',
          parameters: {
            message: '🧪 Test from Workflow Engine\n\nFootball results: {{node-1}}',
          },
        },
      },
    ],
    connections: [
      {
        id: 'conn-1',
        source: 'node-1',
        target: 'node-2',
      },
    ],
    triggers: [{ type: 'manual', config: {} }],
    settings: {},
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const result3 = await workflowExecutor.execute(multiNodeWorkflow);
    console.log(`✅ Status: ${result3.status}`);
    console.log(`⏱️  Duration: ${result3.duration}ms\n`);
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('✅ All tests completed!');
}

// Run tests
testWorkflowEngine().catch(console.error);
