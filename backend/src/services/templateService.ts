/**
 * Template Service
 * Handles CRUD operations, search, and filtering for workflow templates
 */

import { prisma } from '../lib/prisma';
import type { WorkflowTemplate, Prisma } from '@prisma/client';

export interface TemplateFilter {
  category?: string;
  tags?: string[];
  difficulty?: string;
  featured?: boolean;
  search?: string;
  published?: boolean;
}

export interface TemplateCreateInput {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  icon?: string;
  difficulty?: string;
  estimatedTime?: string;
  featured?: boolean;
  nodes: any;
  connections: any;
  triggers?: any;
  settings?: any;
  requiredParams?: any;
  version?: string;
  changelog?: string;
  authorId?: string;
  published?: boolean;
}

export interface TemplateUpdateInput {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  difficulty?: string;
  estimatedTime?: string;
  featured?: boolean;
  nodes?: any;
  connections?: any;
  triggers?: any;
  settings?: any;
  requiredParams?: any;
  version?: string;
  changelog?: string;
  published?: boolean;
}

export const templateService = {
  /**
   * Get all templates with optional filtering
   */
  async getTemplates(filter?: TemplateFilter): Promise<WorkflowTemplate[]> {
    const where: Prisma.WorkflowTemplateWhereInput = {
      published: filter?.published !== undefined ? filter.published : true,
    };

    if (filter?.category) {
      where.category = filter.category;
    }

    if (filter?.difficulty) {
      where.difficulty = filter.difficulty;
    }

    if (filter?.featured !== undefined) {
      where.featured = filter.featured;
    }

    if (filter?.tags && filter.tags.length > 0) {
      where.tags = {
        hasSome: filter.tags,
      };
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { tags: { has: filter.search } },
      ];
    }

    return prisma.workflowTemplate.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { installCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<WorkflowTemplate | null> {
    return prisma.workflowTemplate.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  },

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<WorkflowTemplate[]> {
    return prisma.workflowTemplate.findMany({
      where: {
        featured: true,
        published: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { installCount: 'desc' },
        { rating: 'desc' },
      ],
      take: 10,
    });
  },

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]> {
    return prisma.workflowTemplate.findMany({
      where: {
        category,
        published: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { installCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  },

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    return prisma.workflowTemplate.findMany({
      where: {
        published: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { installCount: 'desc' },
        { rating: 'desc' },
      ],
    });
  },

  /**
   * Create a new template
   */
  async createTemplate(data: TemplateCreateInput): Promise<WorkflowTemplate> {
    return prisma.workflowTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        icon: data.icon,
        difficulty: data.difficulty || 'beginner',
        estimatedTime: data.estimatedTime,
        featured: data.featured || false,
        nodes: data.nodes,
        connections: data.connections,
        triggers: data.triggers || [],
        settings: data.settings,
        requiredParams: data.requiredParams,
        version: data.version || '1.0.0',
        changelog: data.changelog,
        authorId: data.authorId,
        published: data.published !== undefined ? data.published : true,
        publishedAt: data.published !== false ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  },

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    data: TemplateUpdateInput
  ): Promise<WorkflowTemplate> {
    const updateData: Prisma.WorkflowTemplateUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.estimatedTime !== undefined) updateData.estimatedTime = data.estimatedTime;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.nodes !== undefined) updateData.nodes = data.nodes;
    if (data.connections !== undefined) updateData.connections = data.connections;
    if (data.triggers !== undefined) updateData.triggers = data.triggers;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.requiredParams !== undefined) updateData.requiredParams = data.requiredParams;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.changelog !== undefined) updateData.changelog = data.changelog;
    if (data.published !== undefined) {
      updateData.published = data.published;
      if (data.published && !updateData.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    return prisma.workflowTemplate.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await prisma.workflowTemplate.delete({
      where: { id },
    });
  },

  /**
   * Increment install count
   */
  async incrementInstallCount(id: string): Promise<WorkflowTemplate> {
    return prisma.workflowTemplate.update({
      where: { id },
      data: {
        installCount: {
          increment: 1,
        },
      },
    });
  },

  /**
   * Update template rating
   */
  async updateRating(id: string, rating: number): Promise<WorkflowTemplate> {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Simple average for now (can be enhanced with weighted average)
    const currentRating = template.rating || 0;
    const newRating = currentRating === 0 ? rating : (currentRating + rating) / 2;

    return prisma.workflowTemplate.update({
      where: { id },
      data: {
        rating: newRating,
      },
    });
  },

  /**
   * Get template categories with counts
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const templates = await prisma.workflowTemplate.findMany({
      where: { published: true },
      select: { category: true },
    });

    const categoryCounts = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));
  },

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
    const templates = await prisma.workflowTemplate.findMany({
      where: { published: true },
      select: { tags: true },
    });

    const tagCounts = templates.reduce((acc, template) => {
      template.tags.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
