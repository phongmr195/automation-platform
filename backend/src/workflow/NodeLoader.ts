/**
 * Custom Node Loader
 * Safely loads and executes custom nodes at runtime with sandboxing
 */

import * as vm from 'vm';
import { ICustomNode, NodeExecutionContext, NodeExecutionResult } from './CustomNodeSDK';
import { customNodeService } from '../services/customNodeService';
import { prisma } from '../lib/prisma';

export class NodeLoader {
  private loadedNodes: Map<string, ICustomNode> = new Map();
  private nodeCache: Map<string, { code: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Load a custom node by name and version
   */
  async loadNode(name: string, version?: string): Promise<ICustomNode> {
    const cacheKey = `${name}@${version || 'latest'}`;
    
    // Check if already loaded
    if (this.loadedNodes.has(cacheKey)) {
      return this.loadedNodes.get(cacheKey)!;
    }
    
    // Check cache
    const cached = this.nodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      const node = this.instantiateNode(cached.code);
      this.loadedNodes.set(cacheKey, node);
      return node;
    }
    
    // Load from database
    const nodeData = await prisma.customNode.findUnique({
      where: { name },
      include: {
        versions: {
          where: version ? { version } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!nodeData || nodeData.versions.length === 0) {
      throw new Error(`Custom node '${name}' not found`);
    }
    
    const nodeVersion = nodeData.versions[0];
    
    if (!nodeVersion.validated) {
      throw new Error(`Custom node '${name}' version ${nodeVersion.version} is not validated`);
    }
    
    // Use compiled code or compile on-the-fly
    const code = nodeVersion.compiled || nodeVersion.code;
    
    // Cache the code
    this.nodeCache.set(cacheKey, {
      code,
      timestamp: Date.now()
    });
    
    // Instantiate and cache
    const node = this.instantiateNode(code);
    this.loadedNodes.set(cacheKey, node);
    
    // Initialize if needed
    if (node.onInit) {
      await node.onInit();
    }
    
    return node;
  }
  
  /**
   * Instantiate a node from code in a sandbox
   */
  private instantiateNode(code: string): ICustomNode {
    const sandbox: any = {
      exports: {},
      module: { exports: {} },
      require: this.createSafeRequire(),
      console: {
        log: (...args: any[]) => console.log('[CustomNode]', ...args),
        warn: (...args: any[]) => console.warn('[CustomNode]', ...args),
        error: (...args: any[]) => console.error('[CustomNode]', ...args)
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Promise,
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      Buffer
    };
    
    try {
      const script = new vm.Script(code, {
        filename: 'custom-node.js'
      });
      
      const context = vm.createContext(sandbox);
      script.runInContext(context, {
        timeout: 5000, // 5 second timeout for instantiation
        breakOnSigint: true
      });
      
      // Get the exported class
      const NodeClass = sandbox.module.exports.default || sandbox.exports.default;
      
      if (!NodeClass) {
        throw new Error('Custom node must have a default export');
      }
      
      // Instantiate
      const instance = new NodeClass();
      
      // Validate interface
      this.validateNodeInterface(instance);
      
      return instance;
    } catch (error: any) {
      throw new Error(`Failed to load custom node: ${error.message}`);
    }
  }
  
  /**
   * Create a safe require function for sandboxed code
   */
  private createSafeRequire() {
    const allowedModules = new Set([
      'crypto',
      'url',
      'querystring',
      'buffer',
      'util',
      'path',
      'assert'
    ]);
    
    return (moduleName: string) => {
      if (allowedModules.has(moduleName)) {
        return require(moduleName);
      }
      throw new Error(`Module '${moduleName}' is not allowed in custom nodes`);
    };
  }
  
  /**
   * Validate that the node implements ICustomNode interface
   */
  private validateNodeInterface(node: any): void {
    const requiredFields = ['name', 'version', 'displayName', 'description', 'group', 'properties', 'execute'];
    
    for (const field of requiredFields) {
      if (!(field in node)) {
        throw new Error(`Custom node missing required field: ${field}`);
      }
    }
    
    if (typeof node.execute !== 'function') {
      throw new Error('Custom node execute must be a function');
    }
    
    if (!Array.isArray(node.properties)) {
      throw new Error('Custom node properties must be an array');
    }
    
    if (!Array.isArray(node.group)) {
      throw new Error('Custom node group must be an array');
    }
  }
  
  /**
   * Execute a custom node
   */
  async executeNode(name: string, context: NodeExecutionContext, version?: string): Promise<NodeExecutionResult> {
    try {
      const node = await this.loadNode(name, version);
      
      // Execute with timeout
      const timeoutPromise = new Promise<NodeExecutionResult>((_, reject) => {
        setTimeout(() => reject(new Error('Node execution timeout')), 30000); // 30 second timeout
      });
      
      const executePromise = node.execute(context);
      
      const result = await Promise.race([executePromise, timeoutPromise]);
      
      return result;
    } catch (error: any) {
      context.logger.error('Custom node execution failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Preload installed nodes for an organization
   */
  async preloadOrganizationNodes(organizationId: string): Promise<void> {
    const installs = await prisma.customNodeInstall.findMany({
      where: {
        organizationId,
        active: true
      },
      include: {
        node: true
      }
    });
    
    const loadPromises = installs.map(install =>
      this.loadNode(install.node.name, install.version).catch(err => {
        console.error(`Failed to preload node ${install.node.name}:`, err);
      })
    );
    
    await Promise.allSettled(loadPromises);
  }
  
  /**
   * Clear node cache
   */
  clearCache(name?: string, version?: string): void {
    if (name) {
      const cacheKey = `${name}@${version || 'latest'}`;
      this.loadedNodes.delete(cacheKey);
      this.nodeCache.delete(cacheKey);
    } else {
      this.loadedNodes.clear();
      this.nodeCache.clear();
    }
  }
  
  /**
   * Get loaded node definitions for UI
   */
  getLoadedNodeDefinitions(): Array<{
    name: string;
    displayName: string;
    description: string;
    group: string[];
    properties: any[];
    icon?: string;
    color?: string;
  }> {
    const definitions: any[] = [];
    
    this.loadedNodes.forEach((node) => {
      definitions.push({
        name: node.name,
        displayName: node.displayName,
        description: node.description,
        group: node.group,
        properties: node.properties,
        credentials: node.credentials,
        icon: node.icon,
        iconUrl: node.iconUrl,
        color: node.color
      });
    });
    
    return definitions;
  }
  
  /**
   * Unload a node and clean up resources
   */
  async unloadNode(name: string, version?: string): Promise<void> {
    const cacheKey = `${name}@${version || 'latest'}`;
    const node = this.loadedNodes.get(cacheKey);
    
    if (node && node.onDestroy) {
      await node.onDestroy();
    }
    
    this.loadedNodes.delete(cacheKey);
    this.nodeCache.delete(cacheKey);
  }
  
  /**
   * Get node statistics
   */
  getStats() {
    return {
      loadedNodes: this.loadedNodes.size,
      cachedNodes: this.nodeCache.size,
      nodes: Array.from(this.loadedNodes.keys())
    };
  }
}

// Singleton instance
export const nodeLoader = new NodeLoader();
