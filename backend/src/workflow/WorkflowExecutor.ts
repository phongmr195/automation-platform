/**
 * Workflow Executor Engine
 * Core engine for executing workflows
 */

import { 
  Workflow, 
  WorkflowNode, 
  ExecutionContext, 
  WorkflowExecutionResult, 
  NodeExecutionResult 
} from './types';
import { nodeRegistry } from './NodeRegistry';

export class WorkflowExecutor {
  /**
   * Execute a workflow
   */
  async execute(
    workflow: Workflow, 
    triggerData?: any
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    const startedAt = new Date();
    const nodeResults = new Map<string, NodeExecutionResult>();

    // Create execution context
    const context: ExecutionContext = {
      workflowId: workflow.id,
      executionId,
      trigger: {
        type: workflow.triggers[0]?.type || 'manual',
        data: triggerData,
      },
      nodeData: new Map(),
      variables: {},
      startedAt,
    };

    try {
      // Validate workflow
      this.validateWorkflow(workflow);

      // Get execution order (topological sort)
      const executionOrder = this.getExecutionOrder(workflow);
      
      console.log(`🚀 Executing workflow: ${workflow.name} (${executionId})`);
      console.log(`📋 Execution order: ${executionOrder.map(n => n.name).join(' → ')}`);

      // Execute nodes in order
      for (const node of executionOrder) {
        const nodeStartTime = Date.now();
        
        try {
          // Get node executor
          const executor = nodeRegistry.getExecutor(node.data.service);
          if (!executor) {
            throw new Error(`No executor found for node type: ${node.data.service}`);
          }

          // Validate node
          const validation = executor.validate(node);
          if (validation !== true) {
            throw new Error(`Node validation failed: ${validation}`);
          }

          console.log(`  ▶️  Executing node: ${node.name} (${node.data.service})`);

          // Execute node
          const result = await executor.execute(node, context);
          
          const duration = Date.now() - nodeStartTime;
          result.duration = duration;

          // Store result
          nodeResults.set(node.id, result);
          
          if (result.success) {
            // Store output in context for next nodes
            context.nodeData.set(node.id, result.output);
            console.log(`  ✅ Node completed: ${node.name} (${duration}ms)`);
          } else {
            throw new Error(result.error || 'Node execution failed');
          }

        } catch (error) {
          const duration = Date.now() - nodeStartTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          console.error(`  ❌ Node failed: ${node.name} - ${errorMessage}`);
          
          nodeResults.set(node.id, {
            success: false,
            error: errorMessage,
            duration,
          });

          // Check if we should retry
          if (workflow.settings.retryOnError && workflow.settings.maxRetries) {
            // TODO: Implement retry logic
            console.log(`  🔄 Retry not implemented yet`);
          }

          // Stop execution on error (unless configured otherwise)
          throw error;
        }
      }

      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();

      console.log(`✅ Workflow completed successfully (${duration}ms)`);

      return {
        executionId,
        workflowId: workflow.id,
        status: 'success',
        startedAt,
        finishedAt,
        duration,
        nodeResults,
      };

    } catch (error) {
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`❌ Workflow failed: ${errorMessage}`);

      return {
        executionId,
        workflowId: workflow.id,
        status: 'error',
        startedAt,
        finishedAt,
        duration,
        nodeResults,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: Workflow): void {
    // Check if workflow has nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of workflow.nodes) {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Validate connections
    for (const conn of workflow.connections) {
      const sourceExists = workflow.nodes.some(n => n.id === conn.source);
      const targetExists = workflow.nodes.some(n => n.id === conn.target);
      
      if (!sourceExists) {
        throw new Error(`Connection source node not found: ${conn.source}`);
      }
      if (!targetExists) {
        throw new Error(`Connection target node not found: ${conn.target}`);
      }
    }

    // Check for cycles (would cause infinite loop)
    if (this.hasCycle(workflow)) {
      throw new Error('Workflow contains cycles (circular dependencies)');
    }

    // Validate all nodes are registered
    for (const node of workflow.nodes) {
      if (!nodeRegistry.hasNode(node.data.service)) {
        throw new Error(`Unknown node type: ${node.data.service}`);
      }
    }
  }

  /**
   * Get execution order using topological sort
   */
  private getExecutionOrder(workflow: Workflow): WorkflowNode[] {
    const nodes = workflow.nodes;
    const connections = workflow.connections;
    
    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    }
    
    // Build graph
    for (const conn of connections) {
      adjacencyList.get(conn.source)!.push(conn.target);
      inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1);
    }
    
    // Find starting nodes (no incoming edges)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }
    
    // Topological sort
    const result: WorkflowNode[] = [];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId)!;
      result.push(node);
      
      // Reduce in-degree for connected nodes
      for (const targetId of adjacencyList.get(nodeId) || []) {
        const newDegree = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, newDegree);
        
        if (newDegree === 0) {
          queue.push(targetId);
        }
      }
    }
    
    // If not all nodes are in result, there's a cycle
    if (result.length !== nodes.length) {
      throw new Error('Cannot determine execution order (possible cycle)');
    }
    
    return result;
  }

  /**
   * Check if workflow has cycles
   */
  private hasCycle(workflow: Workflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const adjacencyList = new Map<string, string[]>();
    for (const node of workflow.nodes) {
      adjacencyList.set(node.id, []);
    }
    for (const conn of workflow.connections) {
      adjacencyList.get(conn.source)!.push(conn.target);
    }
    
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      for (const neighborId of adjacencyList.get(nodeId) || []) {
        if (!visited.has(neighborId)) {
          if (dfs(neighborId)) {
            return true;
          }
        } else if (recursionStack.has(neighborId)) {
          return true; // Found a cycle
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const workflowExecutor = new WorkflowExecutor();
