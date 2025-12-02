/*
  Warnings:

  - You are about to drop the column `finishedAt` on the `Execution` table. All the data in the column will be lost.
  - You are about to drop the column `logs` on the `Execution` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Execution` table. All the data in the column will be lost.
  - You are about to drop the column `definition` on the `Workflow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publishedVersionId]` on the table `Workflow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Execution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `versionId` to the `Execution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Execution" DROP COLUMN "finishedAt",
DROP COLUMN "logs",
DROP COLUMN "startedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "versionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "definition",
ADD COLUMN     "publishedVersionId" TEXT;

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeLog" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_publishedVersionId_key" ON "Workflow"("publishedVersionId");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeLog" ADD CONSTRAINT "NodeLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
