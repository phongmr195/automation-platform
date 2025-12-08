import { prisma } from '../lib/prisma';
import type { ExecutionMetrics, WorkflowMetrics, ResourceUsage, CostTracking } from '@prisma/client';

export interface DashboardStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDuration: number;
  activeWorkflows: number;
  totalWorkflows: number;
  totalCost: number;
}

export interface ExecutionTrend {
  date: string;
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface WorkflowPerformance {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  lastExecutionAt: Date | null;
}

export interface ResourceMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  activeExecutions: number;
  queuedExecutions: number;
  apiCallCount: number;
}

export interface CostBreakdown {
  totalCost: number;
  apiCosts: Record<string, number>;
  executionCost: number;
  storageCost: number;
  budgetLimit: number | null;
  budgetUsed: number;
}

export class AnalyticsService {
  /**
   * Get dashboard statistics for a time period
   */
  async getDashboardStats(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardStats> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    // Get execution metrics
    const execMetrics = await prisma.executionMetrics.aggregate({
      where: {
        organizationId,
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        totalExecutions: true,
        successfulExecutions: true,
        failedExecutions: true,
      },
      _avg: {
        avgDuration: true,
        successRate: true,
      },
    });

    // Get workflow counts
    const workflowCounts = await prisma.workflow.groupBy({
      by: ['active'],
      where: {
        organizationId,
      },
      _count: true,
    });

    const activeWorkflows = workflowCounts.find(w => w.active)?._count || 0;
    const totalWorkflows = workflowCounts.reduce((sum, w) => sum + w._count, 0);

    // Get cost tracking
    const costData = await prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        totalCost: true,
      },
    });

    return {
      totalExecutions: execMetrics._sum.totalExecutions || 0,
      successfulExecutions: execMetrics._sum.successfulExecutions || 0,
      failedExecutions: execMetrics._sum.failedExecutions || 0,
      successRate: execMetrics._avg.successRate || 0,
      avgDuration: execMetrics._avg.avgDuration || 0,
      activeWorkflows,
      totalWorkflows,
      totalCost: costData._sum.totalCost || 0,
    };
  }

  /**
   * Get execution trends over time
   */
  async getExecutionTrends(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date,
    granularity: 'hour' | 'day' = 'day'
  ): Promise<ExecutionTrend[]> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const end = endDate || new Date();

    const metrics = await prisma.executionMetrics.findMany({
      where: {
        organizationId,
        date: {
          gte: start,
          lte: end,
        },
        hour: granularity === 'hour' ? { not: null } : null,
      },
      orderBy: granularity === 'hour' 
        ? [{ date: 'asc' }, { hour: 'asc' }]
        : { date: 'asc' },
    });

    return metrics.map(m => ({
      date: granularity === 'hour' 
        ? `${m.date.toISOString().split('T')[0]} ${m.hour}:00`
        : m.date.toISOString().split('T')[0],
      total: m.totalExecutions,
      successful: m.successfulExecutions,
      failed: m.failedExecutions,
      successRate: m.successRate,
    }));
  }

  /**
   * Get workflow performance metrics
   */
  async getWorkflowPerformance(
    organizationId?: string,
    limit: number = 10
  ): Promise<WorkflowPerformance[]> {
    const workflows = await prisma.workflowMetrics.findMany({
      where: {
        workflow: {
          organizationId,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        totalExecutions: 'desc',
      },
      take: limit,
    });

    return workflows.map(w => ({
      workflowId: w.workflow.id,
      workflowName: w.workflow.name,
      totalExecutions: w.totalExecutions,
      successRate: w.successRate,
      avgDuration: w.avgDuration,
      lastExecutionAt: w.lastExecutionAt,
    }));
  }

  /**
   * Get slowest workflows
   */
  async getSlowestWorkflows(
    organizationId?: string,
    limit: number = 10
  ): Promise<WorkflowPerformance[]> {
    const workflows = await prisma.workflowMetrics.findMany({
      where: {
        workflow: {
          organizationId,
        },
        avgDuration: {
          gt: 0,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        avgDuration: 'desc',
      },
      take: limit,
    });

    return workflows.map(w => ({
      workflowId: w.workflow.id,
      workflowName: w.workflow.name,
      totalExecutions: w.totalExecutions,
      successRate: w.successRate,
      avgDuration: w.avgDuration,
      lastExecutionAt: w.lastExecutionAt,
    }));
  }

  /**
   * Get failed workflows
   */
  async getFailedWorkflows(
    organizationId?: string,
    limit: number = 10
  ): Promise<WorkflowPerformance[]> {
    const workflows = await prisma.workflowMetrics.findMany({
      where: {
        workflow: {
          organizationId,
        },
        failedExecutions: {
          gt: 0,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        successRate: 'asc',
      },
      take: limit,
    });

    return workflows.map(w => ({
      workflowId: w.workflow.id,
      workflowName: w.workflow.name,
      totalExecutions: w.totalExecutions,
      successRate: w.successRate,
      avgDuration: w.avgDuration,
      lastExecutionAt: w.lastExecutionAt,
    }));
  }

  /**
   * Get resource usage metrics
   */
  async getResourceMetrics(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ResourceMetrics[]> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endDate || new Date();

    const resources = await prisma.resourceUsage.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    return resources.map(r => ({
      timestamp: r.timestamp,
      cpuUsage: r.cpuUsage,
      memoryUsage: r.memoryUsage,
      activeExecutions: r.activeExecutions,
      queuedExecutions: r.queuedExecutions,
      apiCallCount: r.apiCallCount,
    }));
  }

  /**
   * Get cost breakdown
   */
  async getCostBreakdown(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostBreakdown> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    const costs = await prisma.costTracking.findMany({
      where: {
        organizationId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Aggregate API costs
    const apiCosts: Record<string, number> = {};
    let totalApiCost = 0;
    let totalExecutionCost = 0;
    let totalStorageCost = 0;
    let totalCost = 0;

    costs.forEach(cost => {
      if (cost.apiCosts && typeof cost.apiCosts === 'object') {
        const apiCostObj = cost.apiCosts as Record<string, number>;
        Object.entries(apiCostObj).forEach(([service, amount]) => {
          apiCosts[service] = (apiCosts[service] || 0) + amount;
        });
      }
      totalApiCost += cost.totalApiCost;
      totalExecutionCost += cost.executionCost;
      totalStorageCost += cost.storageCost;
      totalCost += cost.totalCost;
    });

    // Get latest budget info
    const latestCost = costs[costs.length - 1];

    return {
      totalCost,
      apiCosts,
      executionCost: totalExecutionCost,
      storageCost: totalStorageCost,
      budgetLimit: latestCost?.budgetLimit || null,
      budgetUsed: latestCost?.budgetUsed || 0,
    };
  }

  /**
   * Update execution metrics after execution completes
   */
  async recordExecution(
    workflowId: string,
    organizationId: string | null | undefined,
    status: string,
    duration: number,
    resources?: {
      cpuUsage?: number;
      memoryUsage?: number;
      apiCalls?: number;
      dbQueries?: number;
    }
  ): Promise<void> {
    const now = new Date();
    const date = new Date(now.toISOString().split('T')[0]);
    const hour = now.getHours();

    // Update hourly execution metrics
    await prisma.executionMetrics.upsert({
      where: {
        date_organizationId_workflowId_hour: {
          date,
          organizationId: organizationId || null,
          workflowId,
          hour,
        },
      },
      create: {
        date,
        hour,
        organizationId: organizationId || null,
        workflowId,
        totalExecutions: 1,
        successfulExecutions: status === 'success' ? 1 : 0,
        failedExecutions: status === 'failed' ? 1 : 0,
        cancelledExecutions: status === 'cancelled' ? 1 : 0,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        p50Duration: duration,
        p95Duration: duration,
        p99Duration: duration,
        successRate: status === 'success' ? 100 : 0,
      },
      update: {
        totalExecutions: { increment: 1 },
        successfulExecutions: status === 'success' ? { increment: 1 } : undefined,
        failedExecutions: status === 'failed' ? { increment: 1 } : undefined,
        cancelledExecutions: status === 'cancelled' ? { increment: 1 } : undefined,
        avgDuration: { increment: duration / 2 }, // Simplified moving average
        minDuration: { set: 0 },
        maxDuration: { set: 0 },
      },
    });

    // Update daily execution metrics
    await prisma.executionMetrics.upsert({
      where: {
        date_organizationId_workflowId_hour: {
          date,
          organizationId: organizationId || null,
          workflowId,
          hour: null,
        },
      },
      create: {
        date,
        organizationId: organizationId || null,
        workflowId,
        totalExecutions: 1,
        successfulExecutions: status === 'success' ? 1 : 0,
        failedExecutions: status === 'failed' ? 1 : 0,
        cancelledExecutions: status === 'cancelled' ? 1 : 0,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        p50Duration: duration,
        p95Duration: duration,
        p99Duration: duration,
        successRate: status === 'success' ? 100 : 0,
      },
      update: {
        totalExecutions: { increment: 1 },
        successfulExecutions: status === 'success' ? { increment: 1 } : undefined,
        failedExecutions: status === 'failed' ? { increment: 1 } : undefined,
        cancelledExecutions: status === 'cancelled' ? { increment: 1 } : undefined,
      },
    });

    // Update workflow metrics
    const currentMetrics = await prisma.workflowMetrics.findUnique({
      where: { workflowId },
    });

    const totalExecs = (currentMetrics?.totalExecutions || 0) + 1;
    const successfulExecs = (currentMetrics?.successfulExecutions || 0) + (status === 'success' ? 1 : 0);
    const failedExecs = (currentMetrics?.failedExecutions || 0) + (status === 'failed' ? 1 : 0);
    const successRate = totalExecs > 0 ? (successfulExecs / totalExecs) * 100 : 0;

    await prisma.workflowMetrics.upsert({
      where: { workflowId },
      create: {
        workflowId,
        totalExecutions: 1,
        successfulExecutions: status === 'success' ? 1 : 0,
        failedExecutions: status === 'failed' ? 1 : 0,
        avgDuration: duration,
        lastDuration: duration,
        fastestDuration: duration,
        slowestDuration: duration,
        successRate,
        uptimeRate: status === 'success' ? 100 : 0,
        lastExecutionAt: now,
        lastSuccessAt: status === 'success' ? now : null,
        lastFailureAt: status === 'failed' ? now : null,
        avgMemoryUsage: resources?.memoryUsage || 0,
        avgCpuUsage: resources?.cpuUsage || 0,
        totalApiCalls: resources?.apiCalls || 0,
        totalDbQueries: resources?.dbQueries || 0,
      },
      update: {
        totalExecutions: { increment: 1 },
        successfulExecutions: status === 'success' ? { increment: 1 } : undefined,
        failedExecutions: status === 'failed' ? { increment: 1 } : undefined,
        lastDuration: duration,
        fastestDuration: Math.min(currentMetrics?.fastestDuration || duration, duration),
        slowestDuration: Math.max(currentMetrics?.slowestDuration || duration, duration),
        successRate,
        lastExecutionAt: now,
        lastSuccessAt: status === 'success' ? now : undefined,
        lastFailureAt: status === 'failed' ? now : undefined,
        totalApiCalls: resources?.apiCalls ? { increment: resources.apiCalls } : undefined,
        totalDbQueries: resources?.dbQueries ? { increment: resources.dbQueries } : undefined,
      },
    });

    // Record resource usage if provided
    if (resources) {
      await prisma.resourceUsage.create({
        data: {
          timestamp: now,
          date,
          hour,
          organizationId: organizationId || null,
          cpuUsage: resources.cpuUsage || 0,
          memoryUsage: resources.memoryUsage || 0,
          apiCallCount: resources.apiCalls || 0,
          dbQueryCount: resources.dbQueries || 0,
        },
      });
    }
  }

  /**
   * Record API cost
   */
  async recordApiCost(
    service: string,
    cost: number,
    organizationId?: string,
    workflowId?: string
  ): Promise<void> {
    const date = new Date(new Date().toISOString().split('T')[0]);

    const existing = await prisma.costTracking.findUnique({
      where: {
        date_organizationId_workflowId: {
          date,
          organizationId: organizationId || null,
          workflowId: workflowId || null,
        },
      },
    });

    const apiCosts = (existing?.apiCosts as Record<string, number>) || {};
    apiCosts[service] = (apiCosts[service] || 0) + cost;
    const totalApiCost = Object.values(apiCosts).reduce((sum, c) => sum + c, 0);
    const totalCost = totalApiCost + (existing?.executionCost || 0) + (existing?.storageCost || 0);

    await prisma.costTracking.upsert({
      where: {
        date_organizationId_workflowId: {
          date,
          organizationId: organizationId || null,
          workflowId: workflowId || null,
        },
      },
      create: {
        date,
        organizationId: organizationId || null,
        workflowId: workflowId || null,
        apiCosts,
        totalApiCost,
        totalCost,
        budgetUsed: totalCost,
      },
      update: {
        apiCosts,
        totalApiCost,
        totalCost,
        budgetUsed: totalCost,
      },
    });
  }

  /**
   * Set budget limit for organization
   */
  async setBudgetLimit(
    organizationId: string,
    budgetLimit: number
  ): Promise<void> {
    const date = new Date(new Date().toISOString().split('T')[0]);

    await prisma.costTracking.upsert({
      where: {
        date_organizationId_workflowId: {
          date,
          organizationId,
          workflowId: null,
        },
      },
      create: {
        date,
        organizationId,
        budgetLimit,
        budgetRemaining: budgetLimit,
      },
      update: {
        budgetLimit,
        budgetRemaining: budgetLimit - (await this.getCostBreakdown(organizationId)).totalCost,
      },
    });
  }
}

export const analyticsService = new AnalyticsService();
