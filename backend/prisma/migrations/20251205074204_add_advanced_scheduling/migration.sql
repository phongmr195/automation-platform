-- CreateEnum
CREATE TYPE "HolidayAction" AS ENUM ('SKIP', 'DELAY_TO_NEXT', 'EXECUTE');

-- CreateEnum
CREATE TYPE "QueueStrategy" AS ENUM ('FIFO', 'LIFO', 'PRIORITY', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('ONE_TIME', 'RECURRING', 'DATE_RANGE');

-- CreateEnum
CREATE TYPE "ExceptionAction" AS ENUM ('SKIP', 'RESCHEDULE', 'DELAY');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'EXECUTED', 'SKIPPED', 'DELAYED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ScheduleConfig" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "skipHolidays" BOOLEAN NOT NULL DEFAULT false,
    "holidayAction" "HolidayAction" NOT NULL DEFAULT 'SKIP',
    "holidayCalendarId" TEXT,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "businessHoursConfig" JSONB,
    "maxExecutionsPerHour" INTEGER,
    "maxExecutionsPerDay" INTEGER,
    "queueStrategy" "QueueStrategy" NOT NULL DEFAULT 'FIFO',
    "maxQueueSize" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleException" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "action" "ExceptionAction" NOT NULL DEFAULT 'SKIP',
    "alternativeCron" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "actualTime" TIMESTAMP(3),
    "status" "ScheduleStatus" NOT NULL,
    "skippedReason" TEXT,
    "delayedBy" INTEGER,
    "executionId" TEXT,
    "queuePosition" INTEGER,
    "queueWaitTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleConfig_workflowId_key" ON "ScheduleConfig"("workflowId");

-- CreateIndex
CREATE INDEX "ScheduleConfig_workflowId_idx" ON "ScheduleConfig"("workflowId");

-- CreateIndex
CREATE INDEX "ScheduleConfig_enabled_idx" ON "ScheduleConfig"("enabled");

-- CreateIndex
CREATE INDEX "HolidayCalendar_organizationId_idx" ON "HolidayCalendar"("organizationId");

-- CreateIndex
CREATE INDEX "HolidayCalendar_isPublic_idx" ON "HolidayCalendar"("isPublic");

-- CreateIndex
CREATE INDEX "Holiday_calendarId_idx" ON "Holiday"("calendarId");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "ScheduleException_scheduleId_idx" ON "ScheduleException"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduleException_startDate_idx" ON "ScheduleException"("startDate");

-- CreateIndex
CREATE INDEX "ScheduleLog_scheduleId_idx" ON "ScheduleLog"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduleLog_scheduledTime_idx" ON "ScheduleLog"("scheduledTime");

-- CreateIndex
CREATE INDEX "ScheduleLog_status_idx" ON "ScheduleLog"("status");

-- CreateIndex
CREATE INDEX "ScheduleLog_executionId_idx" ON "ScheduleLog"("executionId");

-- AddForeignKey
ALTER TABLE "ScheduleConfig" ADD CONSTRAINT "ScheduleConfig_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleConfig" ADD CONSTRAINT "ScheduleConfig_holidayCalendarId_fkey" FOREIGN KEY ("holidayCalendarId") REFERENCES "HolidayCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendar" ADD CONSTRAINT "HolidayCalendar_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "HolidayCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ScheduleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleLog" ADD CONSTRAINT "ScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ScheduleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleLog" ADD CONSTRAINT "ScheduleLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
