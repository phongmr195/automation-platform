/**
 * Node Registry
 * Central registry for all available node types
 */

import { INodeExecutor, NodeDefinition } from './types';

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, NodeDefinition> = new Map();

  private constructor() {}

  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * Register a new node type
   */
  register(definition: NodeDefinition): void {
    if (this.nodes.has(definition.type)) {
      throw new Error(`Node type '${definition.type}' is already registered`);
    }
    this.nodes.set(definition.type, definition);
    console.log(`✅ Registered node: ${definition.type} (${definition.name})`);
  }

  /**
   * Get node definition by type
   */
  getNode(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  /**
   * Get node executor by type
   */
  getExecutor(type: string): INodeExecutor | undefined {
    const node = this.nodes.get(type);
    return node?.executor;
  }

  /**
   * Get all registered nodes
   */
  getAllNodes(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes by category
   */
  getNodesByCategory(category: 'trigger' | 'action' | 'logic' | 'transform' | 'communication'): NodeDefinition[] {
    return Array.from(this.nodes.values()).filter(node => node.category === category);
  }

  /**
   * Check if node type exists
   */
  hasNode(type: string): boolean {
    return this.nodes.has(type);
  }

  /**
   * Unregister a node type (for testing)
   */
  unregister(type: string): boolean {
    return this.nodes.delete(type);
  }

  /**
   * Clear all nodes (for testing)
   */
  clear(): void {
    this.nodes.clear();
  }
}

// Export singleton instance
export const nodeRegistry = NodeRegistry.getInstance();
