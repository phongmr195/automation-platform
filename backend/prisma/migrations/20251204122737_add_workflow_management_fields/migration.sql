-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WorkflowFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowFolder_organizationId_idx" ON "WorkflowFolder"("organizationId");

-- CreateIndex
CREATE INDEX "Workflow_folderId_idx" ON "Workflow"("folderId");

-- CreateIndex
CREATE INDEX "Workflow_starred_idx" ON "Workflow"("starred");

-- CreateIndex
CREATE INDEX "Workflow_lastOpenedAt_idx" ON "Workflow"("lastOpenedAt");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WorkflowFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowFolder" ADD CONSTRAINT "WorkflowFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
