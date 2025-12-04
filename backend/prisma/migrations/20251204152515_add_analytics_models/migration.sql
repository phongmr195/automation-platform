-- CreateTable
CREATE TABLE "ExecutionMetrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER,
    "organizationId" TEXT,
    "workflowId" TEXT,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "cancelledExecutions" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p50Duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95Duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p99Duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowMetrics" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fastestDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slowestDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uptimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastExecutionAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "avgMemoryUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCpuUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalApiCalls" INTEGER NOT NULL DEFAULT 0,
    "totalDbQueries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceUsage" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "organizationId" TEXT,
    "executionId" TEXT,
    "cpuUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memoryUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diskUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "networkIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "networkOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeExecutions" INTEGER NOT NULL DEFAULT 0,
    "queuedExecutions" INTEGER NOT NULL DEFAULT 0,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "dbQueryCount" INTEGER NOT NULL DEFAULT 0,
    "cacheHitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostTracking" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "organizationId" TEXT,
    "workflowId" TEXT,
    "apiCosts" JSONB,
    "totalApiCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "executionCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetLimit" DOUBLE PRECISION,
    "budgetUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetRemaining" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutionMetrics_date_idx" ON "ExecutionMetrics"("date");

-- CreateIndex
CREATE INDEX "ExecutionMetrics_organizationId_idx" ON "ExecutionMetrics"("organizationId");

-- CreateIndex
CREATE INDEX "ExecutionMetrics_workflowId_idx" ON "ExecutionMetrics"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionMetrics_date_organizationId_workflowId_hour_key" ON "ExecutionMetrics"("date", "organizationId", "workflowId", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowMetrics_workflowId_key" ON "WorkflowMetrics"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowMetrics_successRate_idx" ON "WorkflowMetrics"("successRate");

-- CreateIndex
CREATE INDEX "WorkflowMetrics_avgDuration_idx" ON "WorkflowMetrics"("avgDuration");

-- CreateIndex
CREATE INDEX "WorkflowMetrics_lastExecutionAt_idx" ON "WorkflowMetrics"("lastExecutionAt");

-- CreateIndex
CREATE INDEX "ResourceUsage_timestamp_idx" ON "ResourceUsage"("timestamp");

-- CreateIndex
CREATE INDEX "ResourceUsage_organizationId_idx" ON "ResourceUsage"("organizationId");

-- CreateIndex
CREATE INDEX "ResourceUsage_executionId_idx" ON "ResourceUsage"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceUsage_date_hour_organizationId_executionId_key" ON "ResourceUsage"("date", "hour", "organizationId", "executionId");

-- CreateIndex
CREATE INDEX "CostTracking_date_idx" ON "CostTracking"("date");

-- CreateIndex
CREATE INDEX "CostTracking_organizationId_idx" ON "CostTracking"("organizationId");

-- CreateIndex
CREATE INDEX "CostTracking_totalCost_idx" ON "CostTracking"("totalCost");

-- CreateIndex
CREATE UNIQUE INDEX "CostTracking_date_organizationId_workflowId_key" ON "CostTracking"("date", "organizationId", "workflowId");
