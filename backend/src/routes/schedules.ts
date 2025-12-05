import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { AdvancedSchedulingService } from '../services/advancedSchedulingService';
import { HolidayAction, QueueStrategy, ExceptionType, ExceptionAction, ScheduleStatus } from '@prisma/client';

const app = new Hono();

// -------------------------------------------------------
// SCHEDULE CONFIG ENDPOINTS
// -------------------------------------------------------

/**
 * POST /schedules/:workflowId
 * Create or update schedule configuration
 */
app.post('/:workflowId', authMiddleware, async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const body = await c.req.json();

    const config = await AdvancedSchedulingService.upsertScheduleConfig({
      workflowId,
      cronExpression: body.cronExpression,
      enabled: body.enabled,
      timezone: body.timezone,
      skipHolidays: body.skipHolidays,
      holidayAction: body.holidayAction as HolidayAction,
      holidayCalendarId: body.holidayCalendarId,
      businessHoursOnly: body.businessHoursOnly,
      businessHoursConfig: body.businessHoursConfig,
      maxExecutionsPerHour: body.maxExecutionsPerHour,
      maxExecutionsPerDay: body.maxExecutionsPerDay,
      queueStrategy: body.queueStrategy as QueueStrategy,
      maxQueueSize: body.maxQueueSize,
      priority: body.priority,
      maxConcurrent: body.maxConcurrent,
    });

    return c.json({ success: true, data: config }, 201);
  } catch (error: any) {
    console.error('Error creating schedule config:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /schedules/:workflowId
 * Get schedule configuration
 */
app.get('/:workflowId', authMiddleware, async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const config = await AdvancedSchedulingService.getScheduleConfig(workflowId);

    if (!config) {
      return c.json({ success: false, error: 'Schedule not found' }, 404);
    }

    return c.json({ success: true, data: config });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /schedules/:workflowId
 * Delete schedule configuration
 */
app.delete('/:workflowId', authMiddleware, async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    await AdvancedSchedulingService.deleteScheduleConfig(workflowId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -------------------------------------------------------
// HOLIDAY CALENDAR ENDPOINTS
// -------------------------------------------------------

/**
 * POST /schedules/calendars
 * Create holiday calendar
 */
app.post('/calendars', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const organization = c.get('organization');

    const calendar = await AdvancedSchedulingService.createHolidayCalendar({
      name: body.name,
      description: body.description,
      organizationId: organization?.organizationId,
      timezone: body.timezone,
      isPublic: body.isPublic,
    });

    return c.json({ success: true, data: calendar }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /schedules/calendars/:calendarId/holidays
 * Add holiday to calendar
 */
app.post('/calendars/:calendarId/holidays', authMiddleware, async (c) => {
  try {
    const calendarId = c.req.param('calendarId');
    const body = await c.req.json();

    const holiday = await AdvancedSchedulingService.addHoliday({
      calendarId,
      name: body.name,
      date: new Date(body.date),
      isRecurring: body.isRecurring,
      recurrenceRule: body.recurrenceRule,
    });

    return c.json({ success: true, data: holiday }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -------------------------------------------------------
// SCHEDULE EXCEPTIONS ENDPOINTS
// -------------------------------------------------------

/**
 * POST /schedules/:workflowId/exceptions
 * Add schedule exception
 */
app.post('/:workflowId/exceptions', authMiddleware, async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const body = await c.req.json();

    // Get schedule config first
    const config = await AdvancedSchedulingService.getScheduleConfig(workflowId);
    if (!config) {
      return c.json({ success: false, error: 'Schedule not found' }, 404);
    }

    const exception = await AdvancedSchedulingService.addException({
      scheduleId: config.id,
      type: body.type as ExceptionType,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      action: body.action as ExceptionAction,
      alternativeCron: body.alternativeCron,
      reason: body.reason,
    });

    return c.json({ success: true, data: exception }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -------------------------------------------------------
// SCHEDULE HISTORY ENDPOINTS
// -------------------------------------------------------

/**
 * GET /schedules/:workflowId/history
 * Get schedule execution history
 */
app.get('/:workflowId/history', authMiddleware, async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const {
      startDate,
      endDate,
      status,
      limit = '50',
      offset = '0',
    } = c.req.query();

    // Get schedule config
    const config = await AdvancedSchedulingService.getScheduleConfig(workflowId);
    if (!config) {
      return c.json({ success: false, error: 'Schedule not found' }, 404);
    }

    const history = await AdvancedSchedulingService.getScheduleHistory(config.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status as ScheduleStatus,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return c.json({ success: true, data: history });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -------------------------------------------------------
// UTILITY ENDPOINTS
// -------------------------------------------------------

/**
 * GET /schedules/timezones
 * Get list of valid timezones
 */
app.get('/timezones', authMiddleware, async (c) => {
  try {
    // Return common IANA timezones
    const timezones = [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
      { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
      { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Paris', label: 'Paris, Berlin, Madrid' },
      { value: 'Asia/Tokyo', label: 'Tokyo, Osaka' },
      { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
      { value: 'Asia/Singapore', label: 'Singapore' },
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
      { value: 'Pacific/Auckland', label: 'Auckland' },
    ];

    return c.json({ success: true, data: timezones });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /schedules/:workflowId/test
 * Test if workflow should execute at a given time
 */
app.post('/:workflowId/test', authMiddleware, async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const body = await c.req.json();
    const testTime = body.testTime ? new Date(body.testTime) : new Date();

    const result = await AdvancedSchedulingService.shouldExecuteWorkflow(
      workflowId,
      testTime
    );

    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
