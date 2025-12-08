/**
 * Enhanced Workflow Scheduler with Advanced Scheduling (Phase 5.1)
 * 
 * New Features:
 * - Timezone support
 * - Holiday awareness
 * - Business hours only execution
 * - Rate limiting
 * - Queue strategies (FIFO/LIFO/Priority)
 * - Schedule exceptions
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { Workflow } from "./types";
import { AdvancedSchedulingService } from "../services/advancedSchedulingService";
import { ScheduleStatus } from "@prisma/client";
import { logger } from "../lib/logger";

export class EnhancedWorkflowScheduler {
  private queue: Queue;
  private connection: IORedis;
  private scheduledWorkflows: Map<string, string> = new Map();

  constructor(redisUrl?: string) {
    this.connection = new IORedis(
      redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
      }
    );

    this.queue = new Queue("workflow-executions", {
      connection: this.connection,
    });

    // Start processing scheduled jobs
    this.startProcessing();
  }

  /**
   * Schedule a workflow with advanced features
   */
  async schedule(workflow: Workflow): Promise<void> {
    // Get advanced schedule config if exists
    const scheduleConfig = await AdvancedSchedulingService.getScheduleConfig(workflow.id);

    if (!scheduleConfig || !scheduleConfig.enabled) {
      logger.info(`⏭️  No active schedule config for workflow: ${workflow.name}`);
      return;
    }

    const jobName = `workflow-${workflow.id}`;
    const {
      cronExpression,
      timezone,
      priority,
      maxConcurrent,
    } = scheduleConfig;

    try {
      // Add repeatable job to BullMQ
      await this.queue.add(
        jobName,
        {
          workflowId: workflow.id,
          workflowName: workflow.name,
          scheduleConfigId: scheduleConfig.id,
          trigger: {
            type: "schedule",
            cron: cronExpression,
            timezone,
          },
        },
        {
          repeat: {
            pattern: cronExpression,
            tz: timezone,
          },
          priority, // Higher priority = executed first
          removeOnComplete: 100,
          removeOnFail: 200,
        }
      );

      // Store the repeatable job key
      const repeatableJobs = await this.queue.getRepeatableJobs();
      const job = repeatableJobs.find((j) => j.name === jobName);
      if (job) {
        this.scheduledWorkflows.set(workflow.id, job.key);
      }

      logger.info(`✅ Scheduled workflow with advanced features: ${workflow.name}`);
      logger.info(`   Pattern: ${cronExpression}`);
      logger.info(`   Timezone: ${timezone}`);
      logger.info(`   Priority: ${priority}`);
      logger.info(`   Max Concurrent: ${maxConcurrent}`);
      
      if (scheduleConfig.skipHolidays) {
        logger.info(`   Holiday Action: ${scheduleConfig.holidayAction}`);
      }
      if (scheduleConfig.businessHoursOnly) {
        logger.info(`   Business Hours Only: Yes`);
      }
      if (scheduleConfig.maxExecutionsPerHour) {
        logger.info(`   Rate Limit: ${scheduleConfig.maxExecutionsPerHour}/hour`);
      }
    } catch (error) {
      logger.error(`❌ Failed to schedule workflow ${workflow.name}:`, error);
      throw error;
    }
  }

  /**
   * Unschedule a workflow
   */
  async unschedule(workflowId: string): Promise<void> {
    const jobKey = this.scheduledWorkflows.get(workflowId);

    if (!jobKey) {
      logger.info(`⏭️  Workflow ${workflowId} is not scheduled`);
      return;
    }

    try {
      await this.queue.removeRepeatableByKey(jobKey);
      this.scheduledWorkflows.delete(workflowId);
      logger.info(`✅ Unscheduled workflow: ${workflowId}`);
    } catch (error) {
      logger.error(`❌ Failed to unschedule workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Reschedule a workflow (unschedule then schedule)
   */
  async reschedule(workflow: Workflow): Promise<void> {
    await this.unschedule(workflow.id);
    await this.schedule(workflow);
  }

  /**
   * Start processing jobs with advanced scheduling logic
   */
  private startProcessing(): void {
    // This would be implemented in the worker
    // The worker would call shouldExecuteWorkflow before actually executing
    logger.info('📋 Enhanced scheduler initialized');
  }

  /**
   * Process a scheduled job with advanced logic
   * Called by the worker before executing
   */
  static async processScheduledJob(data: {
    workflowId: string;
    scheduleConfigId: string;
    scheduledTime: Date;
  }): Promise<{
    shouldExecute: boolean;
    executeAt?: Date;
    skipReason?: string;
  }> {
    const { workflowId, scheduleConfigId, scheduledTime } = data;

    // Use advanced scheduling service to determine execution
    const decision = await AdvancedSchedulingService.shouldExecuteWorkflow(
      workflowId,
      scheduledTime
    );

    // Log the schedule decision
    await AdvancedSchedulingService.logScheduleExecution({
      scheduleId: scheduleConfigId,
      scheduledTime,
      actualTime: decision.shouldExecute ? new Date() : undefined,
      status: decision.shouldExecute ? ScheduleStatus.SCHEDULED : ScheduleStatus.SKIPPED,
      skippedReason: decision.skipReason,
      delayedBy: decision.executeAt && decision.executeAt !== scheduledTime
        ? decision.executeAt.getTime() - scheduledTime.getTime()
        : undefined,
    });

    return decision;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Get all scheduled workflows
   */
  async getAllScheduled(): Promise<Array<{
    workflowId: string;
    jobKey: string;
    pattern: string;
    next: number;
  }>> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    
    return repeatableJobs.map(job => ({
      workflowId: job.name.replace('workflow-', ''),
      jobKey: job.key,
      pattern: job.pattern || '',
      next: job.next,
    }));
  }

  /**
   * Pause queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('⏸️  Workflow queue paused');
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('▶️  Workflow queue resumed');
  }

  /**
   * Clean up old jobs
   */
  async cleanup(options: {
    grace?: number; // milliseconds
    limit?: number; // max jobs to clean
  } = {}): Promise<void> {
    const grace = options.grace || 24 * 60 * 60 * 1000; // 24 hours
    const limit = options.limit || 1000;

    const cleaned = await this.queue.clean(grace, limit, 'completed');
    logger.info(`🧹 Cleaned ${cleaned.length} completed jobs`);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
    logger.info('🔌 Scheduler connections closed');
  }
}

/**
 * Example Usage:
 * 
 * // Create scheduler
 * const scheduler = new EnhancedWorkflowScheduler();
 * 
 * // Schedule workflow with advanced config
 * const workflow = { id: 'wf-123', name: 'Daily Report', ... };
 * await scheduler.schedule(workflow);
 * 
 * // In worker, before executing:
 * const decision = await EnhancedWorkflowScheduler.processScheduledJob({
 *   workflowId: 'wf-123',
 *   scheduleConfigId: 'sc-456',
 *   scheduledTime: new Date(),
 * });
 * 
 * if (decision.shouldExecute) {
 *   // Execute workflow
 *   await executeWorkflow(workflowId);
 * } else {
 *   console.log('Skipped:', decision.skipReason);
 * }
 */
