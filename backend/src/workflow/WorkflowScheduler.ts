/**
 * Workflow Scheduler
 * Schedule workflows with cron triggers using BullMQ
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { Workflow } from "./types";

export class WorkflowScheduler {
  private queue: Queue;
  private connection: IORedis;
  private scheduledWorkflows: Map<string, string> = new Map(); // workflowId -> repeatableJobKey

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
  }

  /**
   * Schedule a workflow with cron trigger
   */
  async schedule(workflow: Workflow): Promise<void> {
    // Find cron triggers
    const cronTriggers = workflow.triggers.filter(
      (t) => t.type === "schedule" && t.config.cron
    );

    if (cronTriggers.length === 0) {
      console.log(`⏭️  No cron triggers found for workflow: ${workflow.name}`);
      return;
    }

    for (const trigger of cronTriggers) {
      const jobName = `workflow-${workflow.id}`;
      const cronPattern = trigger.config.cron;
      const timezone = trigger.config.timezone || "UTC";

      try {
        // Add repeatable job to BullMQ
        await this.queue.add(
          jobName,
          {
            workflowId: workflow.id,
            workflowName: workflow.name,
            trigger: {
              type: "schedule",
              cron: cronPattern,
              timezone,
            },
          },
          {
            repeat: {
              pattern: cronPattern!,
              tz: timezone,
            },
            removeOnComplete: 50, // Keep last 50 completed jobs
            removeOnFail: 100, // Keep last 100 failed jobs
          }
        );

        // Store the repeatable job key
        const repeatableJobs = await this.queue.getRepeatableJobs();
        const job = repeatableJobs.find((j) => j.name === jobName);
        if (job) {
          this.scheduledWorkflows.set(workflow.id, job.key);
        }

        console.log(`✅ Scheduled workflow: ${workflow.name}`);
        console.log(`   Pattern: ${cronPattern}`);
        console.log(`   Timezone: ${timezone}`);
        console.log(`   Next run: ${this.getNextRun(cronPattern, timezone)}`);
      } catch (error) {
        console.error(
          `❌ Failed to schedule workflow ${workflow.name}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Unschedule a workflow
   */
  async unschedule(workflowId: string): Promise<void> {
    const jobKey = this.scheduledWorkflows.get(workflowId);

    if (!jobKey) {
      console.log(`⏭️  Workflow ${workflowId} is not scheduled`);
      return;
    }

    try {
      await this.queue.removeRepeatableByKey(jobKey);
      this.scheduledWorkflows.delete(workflowId);
      console.log(`✅ Unscheduled workflow: ${workflowId}`);
    } catch (error) {
      console.error(`❌ Failed to unschedule workflow ${workflowId}:`, error);
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
   * Get all scheduled workflows
   */
  async getScheduledWorkflows(): Promise<any[]> {
    const repeatableJobs = await this.queue.getRepeatableJobs();

    return repeatableJobs
      .filter((job) => job.name?.startsWith("workflow-"))
      .map((job) => ({
        workflowId: job.name?.replace("workflow-", ""),
        pattern: job.pattern,
        timezone: job.tz,
        nextRun: new Date(job.next),
        key: job.key,
      }));
  }

  /**
   * Clear all scheduled workflows
   */
  async clearAll(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      if (job.name?.startsWith("workflow-")) {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    this.scheduledWorkflows.clear();
    console.log("✅ Cleared all scheduled workflows");
  }

  /**
   * Get next run time for cron pattern (helper)
   */
  private getNextRun(pattern: string, timezone: string): string {
    try {
      // Simple estimation - in production use cron-parser library
      return "Next run will be calculated by BullMQ";
    } catch (error) {
      return "Unknown";
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<any> {
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
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}

// Export singleton instance
let schedulerInstance: WorkflowScheduler | null = null;

export function getWorkflowScheduler(redisUrl?: string): WorkflowScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new WorkflowScheduler(redisUrl);
  }
  return schedulerInstance;
}
