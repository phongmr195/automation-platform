import { prisma } from '../lib/prisma';
import type { Workflow } from '../workflow/types';
import { Prisma } from '@prisma/client';

/**
 * Workflow Service - Database operations for workflows
 */
export class WorkflowService {
  /**
   * Get all workflows
   */
  async getAllWorkflows() {
    const workflows = await prisma.workflow.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        nodes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      active: w.active,
      nodeCount: Array.isArray(w.nodes) ? w.nodes.length : 0,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) return null;

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as any[],
      connections: workflow.connections as any[],
      triggers: workflow.triggers as any[],
      settings: workflow.settings as any,
      active: workflow.active,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Create new workflow
   */
  async createWorkflow(data: {
    id?: string;
    name: string;
    description?: string;
    nodes?: any[];
    connections?: any[];
    triggers?: any[];
    settings?: any;
    active?: boolean;
  }): Promise<Workflow> {
    const workflow = await prisma.workflow.create({
      data: {
        id: data.id || `wf_${Date.now()}`,
        name: data.name,
        description: data.description,
        nodes: data.nodes || [],
        connections: data.connections || [],
        triggers: data.triggers || [],
        settings: data.settings || {},
        active: data.active !== undefined ? data.active : false,
      },
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as any[],
      connections: workflow.connections as any[],
      triggers: workflow.triggers as any[],
      settings: workflow.settings as any,
      active: workflow.active,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Update existing workflow
   */
  async updateWorkflow(id: string, data: {
    name?: string;
    description?: string;
    nodes?: any[];
    connections?: any[];
    triggers?: any[];
    settings?: any;
    active?: boolean;
  }): Promise<Workflow> {
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        nodes: data.nodes,
        connections: data.connections,
        triggers: data.triggers,
        settings: data.settings,
        active: data.active,
        updatedAt: new Date(),
      },
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as any[],
      connections: workflow.connections as any[],
      triggers: workflow.triggers as any[],
      settings: workflow.settings as any,
      active: workflow.active,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    await prisma.workflow.delete({
      where: { id },
    });
  }

  /**
   * Create execution record
   */
  async createExecution(data: {
    workflowId: string;
    status: string;
    input?: any;
    definitionSnapshot?: any;
  }) {
    return await prisma.execution.create({
      data: {
        workflowId: data.workflowId,
        status: data.status,
        input: data.input,
        definitionSnapshot: data.definitionSnapshot,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Update execution result
   */
  async updateExecution(id: string, data: {
    status: string;
    output?: any;
    error?: string;
    nodeResults?: any;
  }) {
    return await prisma.execution.update({
      where: { id },
      data: {
        status: data.status,
        output: data.output,
        error: data.error,
        nodeResults: data.nodeResults,
        finishedAt: new Date(),
      },
    });
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(id: string) {
    return await prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get executions for a workflow with pagination and filters
   */
  async getExecutionsByWorkflowId(
    workflowId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ExecutionWhereInput = {
      workflowId,
      ...(options.status && options.status !== 'all' && { status: options.status }),
    };

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.execution.count({ where }),
    ]);

    return {
      executions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get executions for a workflow
   */
  async getWorkflowExecutions(workflowId: string, limit: number = 50) {
    return await prisma.execution.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const workflowService = new WorkflowService();
