/**
 * Workflow Engine Index
 * Main export file for workflow system
 */

export * from './types';
export * from './NodeRegistry';
export * from './WorkflowExecutor';
export * from './nodes';

import { registerAllNodes } from './nodes';

// Auto-register all nodes when module is imported
registerAllNodes();
