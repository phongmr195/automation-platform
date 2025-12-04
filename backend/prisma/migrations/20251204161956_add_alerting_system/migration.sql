-- CreateEnum
CREATE TYPE "AlertTriggerType" AS ENUM ('EXECUTION_FAILED', 'EXECUTION_SLOW', 'ERROR_RATE_HIGH', 'SUCCESS_RATE_LOW', 'SCHEDULE_MISSED', 'RESOURCE_LIMIT', 'COST_THRESHOLD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertChannelType" AS ENUM ('EMAIL', 'SLACK', 'WEBHOOK', 'DISCORD', 'TEAMS', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT,
    "triggerType" "AlertTriggerType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "evaluationInterval" INTEGER NOT NULL DEFAULT 300,
    "cooldownPeriod" INTEGER NOT NULL DEFAULT 900,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastEvaluatedAt" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "type" "AlertChannelType" NOT NULL,
    "config" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "alertsSent" INTEGER NOT NULL DEFAULT 0,
    "alertsFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRuleChannel" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRuleChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertHistory" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "workflowId" TEXT,
    "executionId" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "channelsSent" JSONB NOT NULL,
    "channelsFailed" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertRule_organizationId_idx" ON "AlertRule"("organizationId");

-- CreateIndex
CREATE INDEX "AlertRule_workflowId_idx" ON "AlertRule"("workflowId");

-- CreateIndex
CREATE INDEX "AlertRule_enabled_idx" ON "AlertRule"("enabled");

-- CreateIndex
CREATE INDEX "AlertRule_triggerType_idx" ON "AlertRule"("triggerType");

-- CreateIndex
CREATE INDEX "AlertChannel_organizationId_idx" ON "AlertChannel"("organizationId");

-- CreateIndex
CREATE INDEX "AlertChannel_type_idx" ON "AlertChannel"("type");

-- CreateIndex
CREATE INDEX "AlertChannel_enabled_idx" ON "AlertChannel"("enabled");

-- CreateIndex
CREATE INDEX "AlertRuleChannel_ruleId_idx" ON "AlertRuleChannel"("ruleId");

-- CreateIndex
CREATE INDEX "AlertRuleChannel_channelId_idx" ON "AlertRuleChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRuleChannel_ruleId_channelId_key" ON "AlertRuleChannel"("ruleId", "channelId");

-- CreateIndex
CREATE INDEX "AlertHistory_ruleId_idx" ON "AlertHistory"("ruleId");

-- CreateIndex
CREATE INDEX "AlertHistory_workflowId_idx" ON "AlertHistory"("workflowId");

-- CreateIndex
CREATE INDEX "AlertHistory_executionId_idx" ON "AlertHistory"("executionId");

-- CreateIndex
CREATE INDEX "AlertHistory_triggeredAt_idx" ON "AlertHistory"("triggeredAt");

-- CreateIndex
CREATE INDEX "AlertHistory_severity_idx" ON "AlertHistory"("severity");

-- AddForeignKey
ALTER TABLE "AlertRuleChannel" ADD CONSTRAINT "AlertRuleChannel_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRuleChannel" ADD CONSTRAINT "AlertRuleChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "AlertChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertHistory" ADD CONSTRAINT "AlertHistory_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
