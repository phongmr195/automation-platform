-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('GAUGE', 'COUNTER', 'HISTOGRAM', 'SUMMARY');

-- CreateEnum
CREATE TYPE "TraceStatus" AS ENUM ('OK', 'ERROR', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "SystemHealth" (
    "id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "uptime" DOUBLE PRECISION,
    "lastCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UptimeMonitor" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceUrl" TEXT,
    "serviceType" TEXT NOT NULL,
    "checkInterval" INTEGER NOT NULL DEFAULT 60,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "currentStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastStatusChange" TIMESTAMP(3),
    "totalChecks" INTEGER NOT NULL DEFAULT 0,
    "successfulChecks" INTEGER NOT NULL DEFAULT 0,
    "failedChecks" INTEGER NOT NULL DEFAULT 0,
    "uptimePercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastResponseTime" DOUBLE PRECISION,
    "lastCheckAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UptimeMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UptimeCheck" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "errorType" TEXT,
    "metadata" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UptimeIncident" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "affectedChecks" INTEGER NOT NULL DEFAULT 0,
    "downtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UptimeIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "organizationId" TEXT,
    "workflowId" TEXT,
    "executionId" TEXT,
    "nodeId" TEXT,
    "endpoint" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "avg" DOUBLE PRECISION,
    "p50" DOUBLE PRECISION,
    "p95" DOUBLE PRECISION,
    "p99" DOUBLE PRECISION,
    "count" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorCode" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "organizationId" TEXT,
    "workflowId" TEXT,
    "executionId" TEXT,
    "nodeId" TEXT,
    "userId" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "environment" TEXT,
    "version" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "fingerprint" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APMTrace" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "operationName" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "organizationId" TEXT,
    "workflowId" TEXT,
    "executionId" TEXT,
    "nodeId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "status" "TraceStatus" NOT NULL,
    "statusCode" INTEGER,
    "error" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "errorType" TEXT,
    "tags" JSONB,
    "logs" JSONB,
    "serviceName" TEXT,
    "serviceVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APMTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemHealth_component_idx" ON "SystemHealth"("component");

-- CreateIndex
CREATE INDEX "SystemHealth_status_idx" ON "SystemHealth"("status");

-- CreateIndex
CREATE INDEX "SystemHealth_lastCheck_idx" ON "SystemHealth"("lastCheck");

-- CreateIndex
CREATE UNIQUE INDEX "SystemHealth_component_lastCheck_key" ON "SystemHealth"("component", "lastCheck");

-- CreateIndex
CREATE INDEX "UptimeMonitor_serviceName_idx" ON "UptimeMonitor"("serviceName");

-- CreateIndex
CREATE INDEX "UptimeMonitor_serviceType_idx" ON "UptimeMonitor"("serviceType");

-- CreateIndex
CREATE INDEX "UptimeMonitor_currentStatus_idx" ON "UptimeMonitor"("currentStatus");

-- CreateIndex
CREATE INDEX "UptimeMonitor_organizationId_idx" ON "UptimeMonitor"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UptimeMonitor_serviceName_organizationId_key" ON "UptimeMonitor"("serviceName", "organizationId");

-- CreateIndex
CREATE INDEX "UptimeCheck_monitorId_idx" ON "UptimeCheck"("monitorId");

-- CreateIndex
CREATE INDEX "UptimeCheck_status_idx" ON "UptimeCheck"("status");

-- CreateIndex
CREATE INDEX "UptimeCheck_checkedAt_idx" ON "UptimeCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "UptimeIncident_monitorId_idx" ON "UptimeIncident"("monitorId");

-- CreateIndex
CREATE INDEX "UptimeIncident_status_idx" ON "UptimeIncident"("status");

-- CreateIndex
CREATE INDEX "UptimeIncident_severity_idx" ON "UptimeIncident"("severity");

-- CreateIndex
CREATE INDEX "UptimeIncident_startedAt_idx" ON "UptimeIncident"("startedAt");

-- CreateIndex
CREATE INDEX "PerformanceMetric_metricName_idx" ON "PerformanceMetric"("metricName");

-- CreateIndex
CREATE INDEX "PerformanceMetric_metricType_idx" ON "PerformanceMetric"("metricType");

-- CreateIndex
CREATE INDEX "PerformanceMetric_organizationId_idx" ON "PerformanceMetric"("organizationId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_workflowId_idx" ON "PerformanceMetric"("workflowId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_executionId_idx" ON "PerformanceMetric"("executionId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_timestamp_idx" ON "PerformanceMetric"("timestamp");

-- CreateIndex
CREATE INDEX "ErrorLog_errorType_idx" ON "ErrorLog"("errorType");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

-- CreateIndex
CREATE INDEX "ErrorLog_organizationId_idx" ON "ErrorLog"("organizationId");

-- CreateIndex
CREATE INDEX "ErrorLog_workflowId_idx" ON "ErrorLog"("workflowId");

-- CreateIndex
CREATE INDEX "ErrorLog_executionId_idx" ON "ErrorLog"("executionId");

-- CreateIndex
CREATE INDEX "ErrorLog_fingerprint_idx" ON "ErrorLog"("fingerprint");

-- CreateIndex
CREATE INDEX "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "APMTrace_traceId_idx" ON "APMTrace"("traceId");

-- CreateIndex
CREATE INDEX "APMTrace_spanId_idx" ON "APMTrace"("spanId");

-- CreateIndex
CREATE INDEX "APMTrace_parentSpanId_idx" ON "APMTrace"("parentSpanId");

-- CreateIndex
CREATE INDEX "APMTrace_operationName_idx" ON "APMTrace"("operationName");

-- CreateIndex
CREATE INDEX "APMTrace_organizationId_idx" ON "APMTrace"("organizationId");

-- CreateIndex
CREATE INDEX "APMTrace_workflowId_idx" ON "APMTrace"("workflowId");

-- CreateIndex
CREATE INDEX "APMTrace_executionId_idx" ON "APMTrace"("executionId");

-- CreateIndex
CREATE INDEX "APMTrace_startTime_idx" ON "APMTrace"("startTime");

-- CreateIndex
CREATE INDEX "APMTrace_status_idx" ON "APMTrace"("status");

-- CreateIndex
CREATE UNIQUE INDEX "APMTrace_traceId_spanId_key" ON "APMTrace"("traceId", "spanId");

-- AddForeignKey
ALTER TABLE "UptimeCheck" ADD CONSTRAINT "UptimeCheck_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "UptimeMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UptimeIncident" ADD CONSTRAINT "UptimeIncident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "UptimeMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
