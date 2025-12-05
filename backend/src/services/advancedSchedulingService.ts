import { db } from '../lib/prisma';
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { addHours, addDays, isWithinInterval, parseISO, addMinutes } from 'date-fns';
import { 
  ScheduleConfig, 
  HolidayCalendar, 
  Holiday, 
  ScheduleException,
  ScheduleLog,
  HolidayAction,
  QueueStrategy,
  ExceptionType,
  ExceptionAction,
  ScheduleStatus,
  Prisma
} from '@prisma/client';

/**
 * Advanced Scheduling Service (Phase 5.1)
 * 
 * Features:
 * - Timezone support (IANA timezones)
 * - Holiday awareness (skip/delay/execute)
 * - Business hours only execution
 * - Rate limiting (per hour/day)
 * - Queueing strategies (FIFO/LIFO/Priority)
 * - Schedule exceptions
 */
export class AdvancedSchedulingService {
  
  // -------------------------------------------------------
  // SCHEDULE CONFIG MANAGEMENT
  // -------------------------------------------------------
  
  /**
   * Create or update schedule configuration
   */
  static async upsertScheduleConfig(data: {
    workflowId: string;
    cronExpression: string;
    enabled?: boolean;
    timezone?: string;
    skipHolidays?: boolean;
    holidayAction?: HolidayAction;
    holidayCalendarId?: string;
    businessHoursOnly?: boolean;
    businessHoursConfig?: Prisma.JsonValue;
    maxExecutionsPerHour?: number;
    maxExecutionsPerDay?: number;
    queueStrategy?: QueueStrategy;
    maxQueueSize?: number;
    priority?: number;
    maxConcurrent?: number;
  }): Promise<ScheduleConfig> {
    // Validate timezone
    if (data.timezone && !this.isValidTimezone(data.timezone)) {
      throw new Error(`Invalid timezone: ${data.timezone}`);
    }

    // Validate business hours config
    if (data.businessHoursConfig) {
      this.validateBusinessHoursConfig(data.businessHoursConfig);
    }

    return db.scheduleConfig.upsert({
      where: { workflowId: data.workflowId },
      create: {
        workflowId: data.workflowId,
        cronExpression: data.cronExpression,
        enabled: data.enabled ?? true,
        timezone: data.timezone ?? 'UTC',
        skipHolidays: data.skipHolidays ?? false,
        holidayAction: data.holidayAction ?? HolidayAction.SKIP,
        holidayCalendarId: data.holidayCalendarId,
        businessHoursOnly: data.businessHoursOnly ?? false,
        businessHoursConfig: data.businessHoursConfig,
        maxExecutionsPerHour: data.maxExecutionsPerHour,
        maxExecutionsPerDay: data.maxExecutionsPerDay,
        queueStrategy: data.queueStrategy ?? QueueStrategy.FIFO,
        maxQueueSize: data.maxQueueSize,
        priority: data.priority ?? 0,
        maxConcurrent: data.maxConcurrent ?? 1,
      },
      update: {
        cronExpression: data.cronExpression,
        enabled: data.enabled,
        timezone: data.timezone,
        skipHolidays: data.skipHolidays,
        holidayAction: data.holidayAction,
        holidayCalendarId: data.holidayCalendarId,
        businessHoursOnly: data.businessHoursOnly,
        businessHoursConfig: data.businessHoursConfig,
        maxExecutionsPerHour: data.maxExecutionsPerHour,
        maxExecutionsPerDay: data.maxExecutionsPerDay,
        queueStrategy: data.queueStrategy,
        maxQueueSize: data.maxQueueSize,
        priority: data.priority,
        maxConcurrent: data.maxConcurrent,
      },
      include: {
        workflow: true,
        holidayCalendar: true,
      },
    });
  }

  /**
   * Get schedule configuration for a workflow
   */
  static async getScheduleConfig(workflowId: string): Promise<ScheduleConfig | null> {
    return db.scheduleConfig.findUnique({
      where: { workflowId },
      include: {
        workflow: true,
        holidayCalendar: {
          include: {
            holidays: true,
          },
        },
        exceptions: {
          orderBy: { startDate: 'asc' },
        },
      },
    });
  }

  /**
   * Delete schedule configuration
   */
  static async deleteScheduleConfig(workflowId: string): Promise<void> {
    await db.scheduleConfig.delete({
      where: { workflowId },
    });
  }

  // -------------------------------------------------------
  // TIMEZONE UTILITIES
  // -------------------------------------------------------

  /**
   * Validate IANA timezone
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert UTC time to workflow's timezone
   */
  static convertToWorkflowTimezone(utcDate: Date, timezone: string): Date {
    return utcToZonedTime(utcDate, timezone);
  }

  /**
   * Convert workflow timezone to UTC
   */
  static convertToUTC(localDate: Date, timezone: string): Date {
    return zonedTimeToUtc(localDate, timezone);
  }

  /**
   * Get next execution time in workflow's timezone
   */
  static getNextExecutionTime(
    cronExpression: string,
    timezone: string,
    from: Date = new Date()
  ): Date {
    // This would use a cron parser library like 'cron-parser'
    // For now, returning placeholder
    const parser = require('cron-parser');
    const interval = parser.parseExpression(cronExpression, {
      currentDate: from,
      tz: timezone,
    });
    return interval.next().toDate();
  }

  // -------------------------------------------------------
  // HOLIDAY MANAGEMENT
  // -------------------------------------------------------

  /**
   * Create holiday calendar
   */
  static async createHolidayCalendar(data: {
    name: string;
    description?: string;
    organizationId?: string;
    timezone?: string;
    isPublic?: boolean;
  }): Promise<HolidayCalendar> {
    return db.holidayCalendar.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId: data.organizationId,
        timezone: data.timezone ?? 'UTC',
        isPublic: data.isPublic ?? false,
      },
    });
  }

  /**
   * Add holiday to calendar
   */
  static async addHoliday(data: {
    calendarId: string;
    name: string;
    date: Date;
    isRecurring?: boolean;
    recurrenceRule?: Prisma.JsonValue;
  }): Promise<Holiday> {
    return db.holiday.create({
      data: {
        calendarId: data.calendarId,
        name: data.name,
        date: data.date,
        isRecurring: data.isRecurring ?? false,
        recurrenceRule: data.recurrenceRule,
      },
    });
  }

  /**
   * Check if a date is a holiday
   */
  static async isHoliday(calendarId: string, date: Date): Promise<boolean> {
    const calendar = await db.holidayCalendar.findUnique({
      where: { id: calendarId },
      include: { holidays: true },
    });

    if (!calendar) return false;

    // Check for exact date match
    const dateStr = format(date, 'yyyy-MM-dd', { timeZone: calendar.timezone });
    
    for (const holiday of calendar.holidays) {
      const holidayStr = format(holiday.date, 'yyyy-MM-dd', { timeZone: calendar.timezone });
      
      if (holidayStr === dateStr) {
        return true;
      }

      // Check recurring holidays
      if (holiday.isRecurring) {
        const recurring = this.isRecurringHoliday(date, holiday);
        if (recurring) return true;
      }
    }

    return false;
  }

  /**
   * Check if date matches recurring holiday pattern
   */
  private static isRecurringHoliday(date: Date, holiday: Holiday): boolean {
    if (!holiday.recurrenceRule || typeof holiday.recurrenceRule !== 'object') {
      // Simple yearly recurrence
      const holidayMonth = holiday.date.getMonth();
      const holidayDay = holiday.date.getDate();
      return date.getMonth() === holidayMonth && date.getDate() === holidayDay;
    }

    // Handle complex recurrence rules (e.g., "First Monday of September")
    // This would need more sophisticated logic
    return false;
  }

  /**
   * Get next business day after a holiday
   */
  static async getNextBusinessDay(
    calendarId: string,
    date: Date,
    businessHoursConfig?: Prisma.JsonValue
  ): Promise<Date> {
    let nextDay = addDays(date, 1);
    
    while (await this.isHoliday(calendarId, nextDay)) {
      nextDay = addDays(nextDay, 1);
    }

    // Also check business hours
    if (businessHoursConfig) {
      const dayOfWeek = format(nextDay, 'EEEE').toLowerCase();
      const config = businessHoursConfig as any;
      
      if (!config[dayOfWeek]) {
        // Not a business day, move to next
        return this.getNextBusinessDay(calendarId, nextDay, businessHoursConfig);
      }
    }

    return nextDay;
  }

  // -------------------------------------------------------
  // BUSINESS HOURS
  // -------------------------------------------------------

  /**
   * Validate business hours configuration
   */
  static validateBusinessHoursConfig(config: Prisma.JsonValue): void {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const cfg = config as any;

    for (const day of days) {
      if (cfg[day]) {
        const { start, end } = cfg[day];
        if (!start || !end) {
          throw new Error(`Invalid business hours for ${day}: missing start or end time`);
        }
        
        // Validate time format (HH:mm)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          throw new Error(`Invalid time format for ${day}: use HH:mm format`);
        }
      }
    }
  }

  /**
   * Check if time is within business hours
   */
  static isWithinBusinessHours(date: Date, config: Prisma.JsonValue, timezone: string): boolean {
    const dayOfWeek = format(date, 'EEEE', { timeZone: timezone }).toLowerCase();
    const cfg = config as any;
    
    if (!cfg[dayOfWeek]) {
      return false; // No business hours configured for this day
    }

    const { start, end } = cfg[dayOfWeek];
    const currentTime = format(date, 'HH:mm', { timeZone: timezone });

    return currentTime >= start && currentTime <= end;
  }

  /**
   * Get next time within business hours
   */
  static getNextBusinessHoursTime(
    date: Date,
    config: Prisma.JsonValue,
    timezone: string
  ): Date {
    let nextTime = new Date(date);
    const maxDays = 14; // Safety limit
    let daysChecked = 0;

    while (daysChecked < maxDays) {
      if (this.isWithinBusinessHours(nextTime, config, timezone)) {
        return nextTime;
      }

      // Try next business hour slot
      const dayOfWeek = format(nextTime, 'EEEE', { timeZone: timezone }).toLowerCase();
      const cfg = config as any;

      if (cfg[dayOfWeek]) {
        const { start, end } = cfg[dayOfWeek];
        const currentTime = format(nextTime, 'HH:mm', { timeZone: timezone });

        if (currentTime < start) {
          // Before business hours today - move to start time
          const [hours, minutes] = start.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
          return nextTime;
        }
      }

      // Move to next day's start
      nextTime = addDays(nextTime, 1);
      daysChecked++;

      // Set to beginning of day
      const nextDayOfWeek = format(nextTime, 'EEEE', { timeZone: timezone }).toLowerCase();
      if (cfg[nextDayOfWeek]) {
        const { start } = cfg[nextDayOfWeek];
        const [hours, minutes] = start.split(':').map(Number);
        nextTime.setHours(hours, minutes, 0, 0);
      }
    }

    throw new Error('Could not find next business hours within 14 days');
  }

  // -------------------------------------------------------
  // RATE LIMITING
  // -------------------------------------------------------

  /**
   * Check if execution is allowed based on rate limits
   */
  static async checkRateLimits(
    scheduleId: string,
    config: ScheduleConfig
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();

    // Check hourly limit
    if (config.maxExecutionsPerHour) {
      const oneHourAgo = addHours(now, -1);
      const hourlyCount = await db.scheduleLog.count({
        where: {
          scheduleId,
          scheduledTime: { gte: oneHourAgo },
          status: ScheduleStatus.EXECUTED,
        },
      });

      if (hourlyCount >= config.maxExecutionsPerHour) {
        return {
          allowed: false,
          reason: `Hourly rate limit reached (${config.maxExecutionsPerHour}/hour)`,
        };
      }
    }

    // Check daily limit
    if (config.maxExecutionsPerDay) {
      const oneDayAgo = addHours(now, -24);
      const dailyCount = await db.scheduleLog.count({
        where: {
          scheduleId,
          scheduledTime: { gte: oneDayAgo },
          status: ScheduleStatus.EXECUTED,
        },
      });

      if (dailyCount >= config.maxExecutionsPerDay) {
        return {
          allowed: false,
          reason: `Daily rate limit reached (${config.maxExecutionsPerDay}/day)`,
        };
      }
    }

    return { allowed: true };
  }

  // -------------------------------------------------------
  // SCHEDULE EXCEPTIONS
  // -------------------------------------------------------

  /**
   * Add schedule exception
   */
  static async addException(data: {
    scheduleId: string;
    type: ExceptionType;
    startDate: Date;
    endDate?: Date;
    action: ExceptionAction;
    alternativeCron?: string;
    reason?: string;
  }): Promise<ScheduleException> {
    return db.scheduleException.create({
      data: {
        scheduleId: data.scheduleId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        action: data.action,
        alternativeCron: data.alternativeCron,
        reason: data.reason,
      },
    });
  }

  /**
   * Check if date has an exception
   */
  static async getActiveException(
    scheduleId: string,
    date: Date
  ): Promise<ScheduleException | null> {
    const exceptions = await db.scheduleException.findMany({
      where: { scheduleId },
    });

    for (const exception of exceptions) {
      if (this.isExceptionActive(exception, date)) {
        return exception;
      }
    }

    return null;
  }

  /**
   * Check if exception applies to date
   */
  private static isExceptionActive(exception: ScheduleException, date: Date): boolean {
    switch (exception.type) {
      case ExceptionType.ONE_TIME:
        return (
          format(exception.startDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );

      case ExceptionType.DATE_RANGE:
        if (!exception.endDate) return false;
        return isWithinInterval(date, {
          start: exception.startDate,
          end: exception.endDate,
        });

      case ExceptionType.RECURRING:
        // Would need recurrence rule logic
        return false;

      default:
        return false;
    }
  }

  // -------------------------------------------------------
  // SCHEDULE LOGGING
  // -------------------------------------------------------

  /**
   * Log schedule execution
   */
  static async logScheduleExecution(data: {
    scheduleId: string;
    scheduledTime: Date;
    actualTime?: Date;
    status: ScheduleStatus;
    skippedReason?: string;
    delayedBy?: number;
    executionId?: string;
    queuePosition?: number;
    queueWaitTime?: number;
  }): Promise<ScheduleLog> {
    return db.scheduleLog.create({
      data: {
        scheduleId: data.scheduleId,
        scheduledTime: data.scheduledTime,
        actualTime: data.actualTime,
        status: data.status,
        skippedReason: data.skippedReason,
        delayedBy: data.delayedBy,
        executionId: data.executionId,
        queuePosition: data.queuePosition,
        queueWaitTime: data.queueWaitTime,
      },
    });
  }

  /**
   * Get schedule execution history
   */
  static async getScheduleHistory(
    scheduleId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      status?: ScheduleStatus;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: Prisma.ScheduleLogWhereInput = {
      scheduleId,
    };

    if (options.startDate || options.endDate) {
      where.scheduledTime = {};
      if (options.startDate) where.scheduledTime.gte = options.startDate;
      if (options.endDate) where.scheduledTime.lte = options.endDate;
    }

    if (options.status) {
      where.status = options.status;
    }

    const [logs, total] = await Promise.all([
      db.scheduleLog.findMany({
        where,
        include: {
          execution: true,
        },
        orderBy: { scheduledTime: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      db.scheduleLog.count({ where }),
    ]);

    return { logs, total };
  }

  // -------------------------------------------------------
  // EXECUTION DECISION LOGIC
  // -------------------------------------------------------

  /**
   * Determine if and when a workflow should execute
   */
  static async shouldExecuteWorkflow(
    workflowId: string,
    scheduledTime: Date
  ): Promise<{
    shouldExecute: boolean;
    executeAt?: Date;
    reason?: string;
    skipReason?: string;
  }> {
    const config = await this.getScheduleConfig(workflowId);
    
    if (!config || !config.enabled) {
      return {
        shouldExecute: false,
        skipReason: 'Schedule is disabled',
      };
    }

    let executeAt = scheduledTime;

    // Check for exceptions first
    const exception = await this.getActiveException(config.id, scheduledTime);
    if (exception) {
      switch (exception.action) {
        case ExceptionAction.SKIP:
          return {
            shouldExecute: false,
            skipReason: `Exception: ${exception.reason || 'Scheduled exception'}`,
          };

        case ExceptionAction.RESCHEDULE:
          if (exception.alternativeCron) {
            executeAt = this.getNextExecutionTime(
              exception.alternativeCron,
              config.timezone,
              scheduledTime
            );
          }
          break;

        case ExceptionAction.DELAY:
          // Could add delay logic here
          break;
      }
    }

    // Check holidays
    if (config.skipHolidays && config.holidayCalendarId) {
      const isHol = await this.isHoliday(config.holidayCalendarId, executeAt);
      
      if (isHol) {
        switch (config.holidayAction) {
          case HolidayAction.SKIP:
            return {
              shouldExecute: false,
              skipReason: 'Holiday - configured to skip',
            };

          case HolidayAction.DELAY_TO_NEXT:
            executeAt = await this.getNextBusinessDay(
              config.holidayCalendarId,
              executeAt,
              config.businessHoursConfig
            );
            break;

          case HolidayAction.EXECUTE:
            // Execute anyway
            break;
        }
      }
    }

    // Check business hours
    if (config.businessHoursOnly && config.businessHoursConfig) {
      if (!this.isWithinBusinessHours(executeAt, config.businessHoursConfig, config.timezone)) {
        executeAt = this.getNextBusinessHoursTime(
          executeAt,
          config.businessHoursConfig,
          config.timezone
        );
      }
    }

    // Check rate limits
    const rateLimitCheck = await this.checkRateLimits(config.id, config);
    if (!rateLimitCheck.allowed) {
      return {
        shouldExecute: false,
        skipReason: rateLimitCheck.reason,
      };
    }

    return {
      shouldExecute: true,
      executeAt,
      reason: executeAt !== scheduledTime ? 'Rescheduled due to constraints' : undefined,
    };
  }
}
