-- Add performance indexes for frequently queried fields

-- Workflows indexes
CREATE INDEX IF NOT EXISTS "Workflow_organizationId_active_idx" ON "Workflow"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "Workflow_ownerId_idx" ON "Workflow"("ownerId");
CREATE INDEX IF NOT EXISTS "Workflow_createdAt_idx" ON "Workflow"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Workflow_starred_idx" ON "Workflow"("starred");
CREATE INDEX IF NOT EXISTS "Workflow_folderId_idx" ON "Workflow"("folderId");

-- WorkflowExecution indexes (actual table name is 'Execution')
CREATE INDEX IF NOT EXISTS "Execution_workflowId_status_idx" ON "Execution"("workflowId", "status");
CREATE INDEX IF NOT EXISTS "Execution_versionId_idx" ON "Execution"("versionId");
CREATE INDEX IF NOT EXISTS "Execution_startedAt_idx" ON "Execution"("startedAt" DESC);
CREATE INDEX IF NOT EXISTS "Execution_status_startedAt_idx" ON "Execution"("status", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "Execution_createdAt_idx" ON "Execution"("createdAt" DESC);

-- WorkflowCollaborator indexes
CREATE INDEX IF NOT EXISTS "WorkflowCollaborator_userId_idx" ON "WorkflowCollaborator"("userId");
CREATE INDEX IF NOT EXISTS "WorkflowCollaborator_workflowId_permission_idx" ON "WorkflowCollaborator"("workflowId", "permission");
CREATE INDEX IF NOT EXISTS "WorkflowCollaborator_isActive_idx" ON "WorkflowCollaborator"("isActive");

-- WorkflowComment indexes
CREATE INDEX IF NOT EXISTS "WorkflowComment_workflowId_createdAt_idx" ON "WorkflowComment"("workflowId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowComment_userId_idx" ON "WorkflowComment"("userId");
CREATE INDEX IF NOT EXISTS "WorkflowComment_parentId_idx" ON "WorkflowComment"("parentId");
CREATE INDEX IF NOT EXISTS "WorkflowComment_nodeId_idx" ON "WorkflowComment"("nodeId");
CREATE INDEX IF NOT EXISTS "WorkflowComment_resolved_idx" ON "WorkflowComment"("resolved");

-- WorkflowActivity indexes
CREATE INDEX IF NOT EXISTS "WorkflowActivity_workflowId_createdAt_idx" ON "WorkflowActivity"("workflowId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowActivity_userId_idx" ON "WorkflowActivity"("userId");
CREATE INDEX IF NOT EXISTS "WorkflowActivity_type_idx" ON "WorkflowActivity"("type");

-- WorkflowNotification indexes
CREATE INDEX IF NOT EXISTS "WorkflowNotification_userId_read_idx" ON "WorkflowNotification"("userId", "read");
CREATE INDEX IF NOT EXISTS "WorkflowNotification_workflowId_idx" ON "WorkflowNotification"("workflowId");
CREATE INDEX IF NOT EXISTS "WorkflowNotification_createdAt_idx" ON "WorkflowNotification"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowNotification_dismissed_idx" ON "WorkflowNotification"("dismissed");

-- WorkflowTemplate indexes
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_category_idx" ON "WorkflowTemplate"("category");
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_published_idx" ON "WorkflowTemplate"("published");
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_featured_idx" ON "WorkflowTemplate"("featured");
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_installCount_idx" ON "WorkflowTemplate"("installCount" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_rating_idx" ON "WorkflowTemplate"("rating" DESC);

-- Organization indexes
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_createdAt_idx" ON "Organization"("createdAt" DESC);

-- User indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_verified_idx" ON "User"("verified");

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- AlertRule indexes
CREATE INDEX IF NOT EXISTS "AlertRule_organizationId_enabled_idx" ON "AlertRule"("organizationId", "enabled");
CREATE INDEX IF NOT EXISTS "AlertRule_workflowId_idx" ON "AlertRule"("workflowId");

-- AlertHistory indexes
CREATE INDEX IF NOT EXISTS "AlertHistory_ruleId_triggeredAt_idx" ON "AlertHistory"("ruleId", "triggeredAt" DESC);
CREATE INDEX IF NOT EXISTS "AlertHistory_acknowledged_idx" ON "AlertHistory"("acknowledged");

-- ScheduleConfig indexes
CREATE INDEX IF NOT EXISTS "ScheduleConfig_workflowId_enabled_idx" ON "ScheduleConfig"("workflowId", "enabled");

-- WorkflowCommit indexes (Version Control)
CREATE INDEX IF NOT EXISTS "WorkflowCommit_workflowId_createdAt_idx" ON "WorkflowCommit"("workflowId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowCommit_branchId_idx" ON "WorkflowCommit"("branchId");
CREATE INDEX IF NOT EXISTS "WorkflowBranch_workflowId_isDefault_idx" ON "WorkflowBranch"("workflowId", "isDefault");
