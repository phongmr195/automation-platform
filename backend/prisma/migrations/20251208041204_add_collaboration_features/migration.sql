-- CreateEnum
CREATE TYPE "CollaboratorPermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('WORKFLOW_CREATED', 'WORKFLOW_UPDATED', 'WORKFLOW_DELETED', 'WORKFLOW_PUBLISHED', 'WORKFLOW_ACTIVATED', 'WORKFLOW_DEACTIVATED', 'NODE_ADDED', 'NODE_UPDATED', 'NODE_DELETED', 'NODE_MOVED', 'CONNECTION_ADDED', 'CONNECTION_DELETED', 'COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED', 'COMMENT_RESOLVED', 'COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED', 'EXECUTION_STARTED', 'EXECUTION_COMPLETED', 'EXECUTION_FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'COMMENT_REPLY', 'COMMENT_RESOLVED', 'WORKFLOW_SHARED', 'WORKFLOW_UPDATED', 'EXECUTION_FAILED', 'EXECUTION_SUCCESS', 'COLLABORATOR_JOINED');

-- CreateTable
CREATE TABLE "WorkflowCollaborator" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "CollaboratorPermission" NOT NULL DEFAULT 'VIEW',
    "lastSeenAt" TIMESTAMP(3),
    "cursorPosition" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowComment" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nodeId" TEXT,
    "position" JSONB,
    "parentId" TEXT,
    "mentions" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reactions" JSONB,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowActivity" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "ActivityType" NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "changes" JSONB,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "activityId" TEXT,
    "commentId" TEXT,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowCollaborator_workflowId_idx" ON "WorkflowCollaborator"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowCollaborator_userId_idx" ON "WorkflowCollaborator"("userId");

-- CreateIndex
CREATE INDEX "WorkflowCollaborator_isActive_idx" ON "WorkflowCollaborator"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowCollaborator_workflowId_userId_key" ON "WorkflowCollaborator"("workflowId", "userId");

-- CreateIndex
CREATE INDEX "WorkflowComment_workflowId_idx" ON "WorkflowComment"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowComment_userId_idx" ON "WorkflowComment"("userId");

-- CreateIndex
CREATE INDEX "WorkflowComment_nodeId_idx" ON "WorkflowComment"("nodeId");

-- CreateIndex
CREATE INDEX "WorkflowComment_parentId_idx" ON "WorkflowComment"("parentId");

-- CreateIndex
CREATE INDEX "WorkflowComment_resolved_idx" ON "WorkflowComment"("resolved");

-- CreateIndex
CREATE INDEX "WorkflowComment_createdAt_idx" ON "WorkflowComment"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowActivity_workflowId_idx" ON "WorkflowActivity"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowActivity_userId_idx" ON "WorkflowActivity"("userId");

-- CreateIndex
CREATE INDEX "WorkflowActivity_type_idx" ON "WorkflowActivity"("type");

-- CreateIndex
CREATE INDEX "WorkflowActivity_createdAt_idx" ON "WorkflowActivity"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowActivity_batchId_idx" ON "WorkflowActivity"("batchId");

-- CreateIndex
CREATE INDEX "WorkflowNotification_userId_idx" ON "WorkflowNotification"("userId");

-- CreateIndex
CREATE INDEX "WorkflowNotification_workflowId_idx" ON "WorkflowNotification"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowNotification_type_idx" ON "WorkflowNotification"("type");

-- CreateIndex
CREATE INDEX "WorkflowNotification_read_idx" ON "WorkflowNotification"("read");

-- CreateIndex
CREATE INDEX "WorkflowNotification_createdAt_idx" ON "WorkflowNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowCollaborator" ADD CONSTRAINT "WorkflowCollaborator_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCollaborator" ADD CONSTRAINT "WorkflowCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowComment" ADD CONSTRAINT "WorkflowComment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowComment" ADD CONSTRAINT "WorkflowComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowComment" ADD CONSTRAINT "WorkflowComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkflowComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowActivity" ADD CONSTRAINT "WorkflowActivity_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowActivity" ADD CONSTRAINT "WorkflowActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "WorkflowActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "WorkflowComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
