-- DropIndex
DROP INDEX "SystemHealth_component_lastCheck_key";

-- CreateIndex
CREATE INDEX "SystemHealth_component_lastCheck_idx" ON "SystemHealth"("component", "lastCheck");
