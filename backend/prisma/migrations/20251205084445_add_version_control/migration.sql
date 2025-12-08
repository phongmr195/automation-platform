-- CreateEnum
CREATE TYPE "DiffType" AS ENUM ('NODES_CHANGED', 'CONNECTIONS_CHANGED', 'SETTINGS_CHANGED', 'COMPLETE_REWRITE', 'MINOR_CHANGE');

-- CreateEnum
CREATE TYPE "MergeStatus" AS ENUM ('OPEN', 'MERGED', 'CLOSED', 'CONFLICTED');

-- CreateTable
CREATE TABLE "WorkflowCommit" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "branchId" TEXT,
    "versionId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorId" TEXT,
    "parentSha" TEXT,
    "changes" JSONB,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowBranch" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headSha" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDiff" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromSha" TEXT NOT NULL,
    "toSha" TEXT NOT NULL,
    "diffType" "DiffType" NOT NULL,
    "diffData" JSONB NOT NULL,
    "nodesAdded" INTEGER NOT NULL DEFAULT 0,
    "nodesRemoved" INTEGER NOT NULL DEFAULT 0,
    "nodesModified" INTEGER NOT NULL DEFAULT 0,
    "connectionsAdded" INTEGER NOT NULL DEFAULT 0,
    "connectionsRemoved" INTEGER NOT NULL DEFAULT 0,
    "settingsChanged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSnapshot" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "commitSha" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowMergeRequest" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "status" "MergeStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT,
    "assignedTo" TEXT,
    "mergedAt" TIMESTAMP(3),
    "mergedBy" TEXT,
    "conflicts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowMergeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowCommit_sha_key" ON "WorkflowCommit"("sha");

-- CreateIndex
CREATE INDEX "WorkflowCommit_workflowId_idx" ON "WorkflowCommit"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowCommit_branchId_idx" ON "WorkflowCommit"("branchId");

-- CreateIndex
CREATE INDEX "WorkflowCommit_versionId_idx" ON "WorkflowCommit"("versionId");

-- CreateIndex
CREATE INDEX "WorkflowCommit_sha_idx" ON "WorkflowCommit"("sha");

-- CreateIndex
CREATE INDEX "WorkflowCommit_parentSha_idx" ON "WorkflowCommit"("parentSha");

-- CreateIndex
CREATE INDEX "WorkflowCommit_authorId_idx" ON "WorkflowCommit"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowBranch_headSha_key" ON "WorkflowBranch"("headSha");

-- CreateIndex
CREATE INDEX "WorkflowBranch_workflowId_idx" ON "WorkflowBranch"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowBranch_headSha_idx" ON "WorkflowBranch"("headSha");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowBranch_workflowId_name_key" ON "WorkflowBranch"("workflowId", "name");

-- CreateIndex
CREATE INDEX "WorkflowDiff_workflowId_idx" ON "WorkflowDiff"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDiff_workflowId_fromSha_toSha_key" ON "WorkflowDiff"("workflowId", "fromSha", "toSha");

-- CreateIndex
CREATE INDEX "WorkflowSnapshot_workflowId_idx" ON "WorkflowSnapshot"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowSnapshot_commitSha_idx" ON "WorkflowSnapshot"("commitSha");

-- CreateIndex
CREATE INDEX "WorkflowMergeRequest_workflowId_idx" ON "WorkflowMergeRequest"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowMergeRequest_status_idx" ON "WorkflowMergeRequest"("status");

-- AddForeignKey
ALTER TABLE "WorkflowCommit" ADD CONSTRAINT "WorkflowCommit_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCommit" ADD CONSTRAINT "WorkflowCommit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "WorkflowBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCommit" ADD CONSTRAINT "WorkflowCommit_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCommit" ADD CONSTRAINT "WorkflowCommit_parentSha_fkey" FOREIGN KEY ("parentSha") REFERENCES "WorkflowCommit"("sha") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowBranch" ADD CONSTRAINT "WorkflowBranch_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowBranch" ADD CONSTRAINT "WorkflowBranch_headSha_fkey" FOREIGN KEY ("headSha") REFERENCES "WorkflowCommit"("sha") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDiff" ADD CONSTRAINT "WorkflowDiff_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSnapshot" ADD CONSTRAINT "WorkflowSnapshot_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowMergeRequest" ADD CONSTRAINT "WorkflowMergeRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
