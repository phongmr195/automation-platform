-- DropForeignKey
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_workflowId_fkey";

-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "nodeResults" JSONB,
ALTER COLUMN "versionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "connections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "nodes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "triggers" JSONB NOT NULL DEFAULT '[]';

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
