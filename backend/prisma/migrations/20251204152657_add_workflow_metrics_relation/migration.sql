-- AddForeignKey
ALTER TABLE "WorkflowMetrics" ADD CONSTRAINT "WorkflowMetrics_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
