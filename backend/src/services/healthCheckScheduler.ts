import cron from 'node-cron';
import { HealthCheckService, UptimeMonitoringService } from './monitoringService';
import { db } from '../lib/prisma';
import { captureException, addBreadcrumb } from '../lib/sentry';

/**
 * Health Check Scheduler Service
 * 
 * Runs periodic health checks on system components and uptime monitors
 */
export class HealthCheckScheduler {
  private static systemHealthJob: cron.ScheduledTask | null = null;
  private static uptimeMonitorJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all scheduled health checks
   */
  static start() {
    console.log('🚀 Starting Health Check Scheduler...');

    // Start system health checks (every 1 minute)
    this.startSystemHealthChecks();

    // Start uptime monitor checks
    this.startUptimeMonitorChecks();

    console.log('✅ Health Check Scheduler started');
  }

  /**
   * Stop all scheduled health checks
   */
  static stop() {
    console.log('⏹️  Stopping Health Check Scheduler...');

    if (this.systemHealthJob) {
      this.systemHealthJob.stop();
      this.systemHealthJob = null;
    }

    this.uptimeMonitorJobs.forEach((job) => job.stop());
    this.uptimeMonitorJobs.clear();

    console.log('✅ Health Check Scheduler stopped');
  }

  /**
   * Start system-wide health checks
   * Runs every 1 minute
   */
  private static startSystemHealthChecks() {
    this.systemHealthJob = cron.schedule('* * * * *', async () => {
      try {
        addBreadcrumb('health_check', 'Running system health check');
        
        const health = await HealthCheckService.getSystemHealth();
        
        console.log(`[Health Check] System status: ${health.status}`);
        
        // Log degraded or unhealthy components
        const unhealthyComponents = health.components.filter(
          c => c.status === 'UNHEALTHY' || c.status === 'DEGRADED'
        );
        
        if (unhealthyComponents.length > 0) {
          console.warn('[Health Check] Unhealthy components:', 
            unhealthyComponents.map(c => `${c.component}: ${c.status}`).join(', ')
          );
          
          // Capture in Sentry if any component is unhealthy
          if (unhealthyComponents.some(c => c.status === 'UNHEALTHY')) {
            captureException(new Error('System health check detected unhealthy components'), {
              tags: {
                health_status: health.status,
              },
              extra: {
                components: unhealthyComponents,
              },
            });
          }
        }
      } catch (error: any) {
        console.error('[Health Check] System health check failed:', error);
        captureException(error, {
          tags: {
            job: 'system_health_check',
          },
        });
      }
    });

    console.log('✅ System health checks scheduled (every 1 minute)');
  }

  /**
   * Start uptime monitor checks
   * Each monitor runs on its own schedule
   */
  private static async startUptimeMonitorChecks() {
    try {
      // Get all enabled monitors
      const monitors = await db.uptimeMonitor.findMany({
        where: { enabled: true },
      });

      console.log(`📊 Found ${monitors.length} enabled uptime monitors`);

      for (const monitor of monitors) {
        this.scheduleMonitor(monitor.id, monitor.checkInterval);
      }
    } catch (error: any) {
      console.error('[Health Check] Failed to load uptime monitors:', error);
      captureException(error, {
        tags: {
          job: 'uptime_monitor_loader',
        },
      });
    }
  }

  /**
   * Schedule a specific monitor
   */
  static scheduleMonitor(monitorId: string, intervalSeconds: number) {
    // Stop existing job if any
    this.unscheduleMonitor(monitorId);

    // Convert interval to cron expression
    const cronExpression = this.intervalToCron(intervalSeconds);
    
    if (!cronExpression) {
      console.warn(`[Health Check] Invalid interval for monitor ${monitorId}: ${intervalSeconds}s`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        addBreadcrumb('uptime_check', `Running uptime check for monitor ${monitorId}`);
        
        const result = await UptimeMonitoringService.performCheck(monitorId);
        
        if (result.status === 'UNHEALTHY') {
          console.warn(
            `[Health Check] Monitor ${monitorId} is unhealthy: ${result.errorMessage}`
          );
        }
      } catch (error: any) {
        console.error(`[Health Check] Monitor ${monitorId} check failed:`, error);
        captureException(error, {
          tags: {
            job: 'uptime_monitor_check',
            monitor_id: monitorId,
          },
        });
      }
    });

    this.uptimeMonitorJobs.set(monitorId, job);
    console.log(`✅ Scheduled uptime monitor ${monitorId} (every ${intervalSeconds}s)`);
  }

  /**
   * Unschedule a specific monitor
   */
  static unscheduleMonitor(monitorId: string) {
    const job = this.uptimeMonitorJobs.get(monitorId);
    if (job) {
      job.stop();
      this.uptimeMonitorJobs.delete(monitorId);
      console.log(`⏹️  Unscheduled uptime monitor ${monitorId}`);
    }
  }

  /**
   * Reschedule a monitor with a new interval
   */
  static async rescheduleMonitor(monitorId: string) {
    try {
      const monitor = await db.uptimeMonitor.findUnique({
        where: { id: monitorId },
      });

      if (!monitor || !monitor.enabled) {
        this.unscheduleMonitor(monitorId);
        return;
      }

      this.scheduleMonitor(monitorId, monitor.checkInterval);
    } catch (error: any) {
      console.error(`[Health Check] Failed to reschedule monitor ${monitorId}:`, error);
    }
  }

  /**
   * Convert interval in seconds to cron expression
   */
  private static intervalToCron(intervalSeconds: number): string | null {
    if (intervalSeconds < 60) {
      // Less than 1 minute - not supported by cron
      return null;
    }

    const intervalMinutes = Math.floor(intervalSeconds / 60);

    if (intervalMinutes === 1) {
      // Every minute
      return '* * * * *';
    } else if (intervalMinutes < 60 && 60 % intervalMinutes === 0) {
      // Every N minutes (must divide evenly into 60)
      return `*/${intervalMinutes} * * * *`;
    } else if (intervalMinutes === 60) {
      // Every hour
      return '0 * * * *';
    } else if (intervalMinutes % 60 === 0) {
      // Every N hours
      const hours = intervalMinutes / 60;
      if (24 % hours === 0) {
        return `0 */${hours} * * *`;
      }
    }

    // Default to every 5 minutes for complex intervals
    console.warn(
      `[Health Check] Complex interval ${intervalSeconds}s approximated to 5 minutes`
    );
    return '*/5 * * * *';
  }

  /**
   * Clean up old health check records (keep last 30 days)
   */
  static async cleanupOldRecords() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean up old system health records
      const deletedHealth = await db.systemHealth.deleteMany({
        where: {
          lastCheck: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Clean up old uptime checks
      const deletedChecks = await db.uptimeCheck.deleteMany({
        where: {
          checkedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Clean up resolved incidents older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deletedIncidents = await db.uptimeIncident.deleteMany({
        where: {
          status: 'RESOLVED',
          resolvedAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      console.log(
        `[Health Check] Cleanup: Deleted ${deletedHealth.count} health records, ` +
        `${deletedChecks.count} uptime checks, ${deletedIncidents.count} incidents`
      );
    } catch (error: any) {
      console.error('[Health Check] Cleanup failed:', error);
      captureException(error, {
        tags: {
          job: 'health_check_cleanup',
        },
      });
    }
  }

  /**
   * Schedule daily cleanup job (runs at 2 AM)
   */
  static scheduleCleanup() {
    cron.schedule('0 2 * * *', async () => {
      console.log('[Health Check] Running daily cleanup...');
      await this.cleanupOldRecords();
    });

    console.log('✅ Daily cleanup scheduled (2 AM)');
  }
}

export default HealthCheckScheduler;

