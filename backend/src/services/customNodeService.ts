/**
 * Custom Node Service
 * Handles CRUD operations, validation, publishing, and management of custom nodes
 */

import { prisma } from '../lib/prisma';
import { CustomNode, CustomNodeVersion, CustomNodeInstall, Prisma } from '@prisma/client';
import * as vm from 'vm';
import * as ts from 'typescript';

export interface CreateCustomNodeInput {
  name: string;
  displayName: string;
  description: string;
  author: string;
  authorName: string;
  category: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  repository?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
}

export interface CreateNodeVersionInput {
  nodeId: string;
  version: string;
  changelog?: string;
  code: string;
  dependencies?: Record<string, string>;
}

export interface PublishNodeInput {
  nodeId: string;
  version: string;
}

export interface SearchNodesInput {
  query?: string;
  category?: string;
  published?: boolean;
  featured?: boolean;
  verified?: boolean;
  sortBy?: 'downloads' | 'rating' | 'recent' | 'name';
  page?: number;
  limit?: number;
}

export interface InstallNodeInput {
  nodeId: string;
  version: string;
  organizationId?: string;
  userId?: string;
}

export class CustomNodeService {
  /**
   * Create a new custom node
   */
  async createNode(input: CreateCustomNodeInput): Promise<CustomNode> {
    const node = await prisma.customNode.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        author: input.author,
        authorName: input.authorName,
        category: input.category,
        icon: input.icon,
        iconUrl: input.iconUrl,
        color: input.color,
        repository: input.repository,
        homepage: input.homepage,
        license: input.license,
        keywords: input.keywords || []
      }
    });
    
    return node;
  }
  
  /**
   * Get node by ID
   */
  async getNode(nodeId: string, includeVersions = false) {
    return await prisma.customNode.findUnique({
      where: { id: nodeId },
      include: {
        versions: includeVersions ? {
          orderBy: { createdAt: 'desc' }
        } : false,
        _count: {
          select: {
            versions: true,
            installs_rel: true,
            reviews: true
          }
        }
      }
    });
  }
  
  /**
   * Get node by name
   */
  async getNodeByName(name: string) {
    return await prisma.customNode.findUnique({
      where: { name },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }
  
  /**
   * Search and filter nodes
   */
  async searchNodes(input: SearchNodesInput) {
    const {
      query,
      category,
      published = true,
      featured,
      verified,
      sortBy = 'downloads',
      page = 1,
      limit = 20
    } = input;
    
    const where: Prisma.CustomNodeWhereInput = {
      AND: [
        published !== undefined ? { published } : {},
        featured !== undefined ? { featured } : {},
        verified !== undefined ? { verified } : {},
        category ? { category } : {},
        query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { keywords: { has: query } }
          ]
        } : {}
      ]
    };
    
    const orderBy: Prisma.CustomNodeOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'downloads':
          return { downloads: 'desc' };
        case 'rating':
          return { rating: 'desc' };
        case 'recent':
          return { publishedAt: 'desc' };
        case 'name':
          return { displayName: 'asc' };
        default:
          return { downloads: 'desc' };
      }
    })();
    
    const [nodes, total] = await Promise.all([
      prisma.customNode.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: {
              versions: true,
              installs_rel: true,
              reviews: true
            }
          }
        }
      }),
      prisma.customNode.count({ where })
    ]);
    
    return {
      nodes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  /**
   * Create a new version of a node
   */
  async createVersion(input: CreateNodeVersionInput): Promise<CustomNodeVersion> {
    const { nodeId, version, changelog, code, dependencies } = input;
    
    // Validate the node code
    const validation = await this.validateNodeCode(code);
    
    if (!validation.valid) {
      throw new Error(`Node validation failed: ${validation.errors?.join(', ')}`);
    }
    
    // Compile TypeScript to JavaScript
    const compiled = this.compileTypeScript(code);
    
    const nodeVersion = await prisma.customNodeVersion.create({
      data: {
        nodeId,
        version,
        changelog,
        code,
        compiled: compiled.code,
        sourceMap: compiled.sourceMap,
        dependencies: dependencies || {},
        definition: validation.definition || {},
        properties: validation.properties || [],
        credentials: validation.credentials || [],
        documentation: validation.documentation || {},
        validated: validation.valid,
        validationErrors: validation.errors?.join(', ')
      }
    });
    
    return nodeVersion;
  }
  
  /**
   * Validate node code
   */
  private async validateNodeCode(code: string): Promise<{
    valid: boolean;
    errors?: string[];
    definition?: any;
    properties?: any[];
    credentials?: any[];
    documentation?: any;
  }> {
    const errors: string[] = [];
    
    try {
      // Compile TypeScript
      const compiled = this.compileTypeScript(code);
      
      if (compiled.diagnostics.length > 0) {
        errors.push(...compiled.diagnostics);
      }
      
      // Try to instantiate the node in a sandbox
      const sandbox: any = {
        exports: {},
        require: (module: string) => {
          // Allow specific modules
          const allowedModules = ['crypto', 'url', 'querystring'];
          if (allowedModules.includes(module)) {
            return require(module);
          }
          throw new Error(`Module '${module}' is not allowed`);
        }
      };
      
      const script = new vm.Script(compiled.code);
      const context = vm.createContext(sandbox);
      script.runInContext(context);
      
      // Check if default export exists
      const NodeClass = sandbox.exports.default;
      if (!NodeClass) {
        errors.push('Node must have a default export');
        return { valid: false, errors };
      }
      
      // Instantiate and validate
      const instance = new NodeClass();
      
      // Check required properties
      const requiredFields = ['name', 'version', 'displayName', 'description', 'group', 'properties', 'execute'];
      for (const field of requiredFields) {
        if (!(field in instance)) {
          errors.push(`Node missing required field: ${field}`);
        }
      }
      
      // Validate execute is a function
      if (typeof instance.execute !== 'function') {
        errors.push('execute must be a function');
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        definition: {
          name: instance.name,
          version: instance.version,
          displayName: instance.displayName,
          description: instance.description,
          group: instance.group,
          icon: instance.icon,
          iconUrl: instance.iconUrl,
          color: instance.color
        },
        properties: instance.properties,
        credentials: instance.credentials,
        documentation: instance.documentation
      };
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
      return { valid: false, errors };
    }
  }
  
  /**
   * Compile TypeScript to JavaScript
   */
  private compileTypeScript(code: string): {
    code: string;
    sourceMap?: string;
    diagnostics: string[];
  } {
    const diagnostics: string[] = [];
    
    const result = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        sourceMap: true,
        esModuleInterop: true,
        skipLibCheck: true
      }
    });
    
    if (result.diagnostics && result.diagnostics.length > 0) {
      diagnostics.push(
        ...result.diagnostics.map(d => 
          ts.flattenDiagnosticMessageText(d.messageText, '\n')
        )
      );
    }
    
    return {
      code: result.outputText,
      sourceMap: result.sourceMapText,
      diagnostics
    };
  }
  
  /**
   * Publish a node version
   */
  async publishNode(input: PublishNodeInput): Promise<CustomNode> {
    const { nodeId, version } = input;
    
    // Verify version exists and is validated
    const nodeVersion = await prisma.customNodeVersion.findFirst({
      where: {
        nodeId,
        version
      }
    });
    
    if (!nodeVersion) {
      throw new Error('Node version not found');
    }
    
    if (!nodeVersion.validated) {
      throw new Error('Node version must be validated before publishing');
    }
    
    // Update node status
    const node = await prisma.customNode.update({
      where: { id: nodeId },
      data: {
        published: true,
        status: 'published',
        publishedAt: new Date()
      }
    });
    
    // Update version
    await prisma.customNodeVersion.update({
      where: { id: nodeVersion.id },
      data: {
        publishedAt: new Date()
      }
    });
    
    return node;
  }
  
  /**
   * Install a node for organization or user
   */
  async installNode(input: InstallNodeInput): Promise<CustomNodeInstall> {
    const { nodeId, version, organizationId, userId } = input;
    
    // Verify node and version exist
    const nodeVersion = await prisma.customNodeVersion.findFirst({
      where: { nodeId, version }
    });
    
    if (!nodeVersion) {
      throw new Error('Node version not found');
    }
    
    // Create or update installation
    const install = await prisma.customNodeInstall.upsert({
      where: {
        nodeId_organizationId_userId: {
          nodeId,
          organizationId: organizationId || '',
          userId: userId || ''
        }
      },
      create: {
        nodeId,
        version,
        organizationId,
        userId,
        active: true
      },
      update: {
        version,
        active: true,
        updatedAt: new Date()
      }
    });
    
    // Increment install count
    await prisma.customNode.update({
      where: { id: nodeId },
      data: { installs: { increment: 1 } }
    });
    
    return install;
  }
  
  /**
   * Uninstall a node
   */
  async uninstallNode(nodeId: string, organizationId?: string, userId?: string): Promise<void> {
    await prisma.customNodeInstall.update({
      where: {
        nodeId_organizationId_userId: {
          nodeId,
          organizationId: organizationId || '',
          userId: userId || ''
        }
      },
      data: {
        active: false
      }
    });
  }
  
  /**
   * Get installed nodes for organization or user
   */
  async getInstalledNodes(organizationId?: string, userId?: string) {
    return await prisma.customNodeInstall.findMany({
      where: {
        organizationId,
        userId,
        active: true
      },
      include: {
        node: {
          include: {
            versions: {
              where: {
                version: {
                  equals: prisma.customNodeInstall.fields.version
                }
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Get node statistics
   */
  async getNodeStats(nodeId: string) {
    const [node, installs, reviews] = await Promise.all([
      prisma.customNode.findUnique({
        where: { id: nodeId }
      }),
      prisma.customNodeInstall.count({
        where: { nodeId, active: true }
      }),
      prisma.customNodeReview.findMany({
        where: { nodeId },
        select: { rating: true }
      })
    ]);
    
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    return {
      downloads: node?.downloads || 0,
      installs,
      reviews: reviews.length,
      avgRating,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length
      }
    };
  }
  
  /**
   * Update node metadata
   */
  async updateNode(nodeId: string, data: Partial<CreateCustomNodeInput>): Promise<CustomNode> {
    return await prisma.customNode.update({
      where: { id: nodeId },
      data
    });
  }
  
  /**
   * Delete a node (soft delete by setting status to deprecated)
   */
  async deleteNode(nodeId: string): Promise<CustomNode> {
    return await prisma.customNode.update({
      where: { id: nodeId },
      data: {
        status: 'deprecated',
        published: false
      }
    });
  }
  
  /**
   * Get trending nodes
   */
  async getTrendingNodes(limit = 10) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return await prisma.customNode.findMany({
      where: {
        published: true,
        publishedAt: {
          gte: oneWeekAgo
        }
      },
      orderBy: [
        { downloads: 'desc' },
        { rating: 'desc' }
      ],
      take: limit,
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }
  
  /**
   * Get featured nodes
   */
  async getFeaturedNodes(limit = 10) {
    return await prisma.customNode.findMany({
      where: {
        published: true,
        featured: true
      },
      orderBy: [
        { rating: 'desc' },
        { downloads: 'desc' }
      ],
      take: limit,
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }
}

export const customNodeService = new CustomNodeService();
