ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "isSynthetic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "responsibility" TEXT;
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "harness" TEXT;
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "objectiveRef" TEXT;

ALTER TABLE "AgentInterrupt" ADD COLUMN IF NOT EXISTS "deliveryState" TEXT NOT NULL DEFAULT 'requested';
ALTER TABLE "AgentInterrupt" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "AgentInterrupt" ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMP(3);
ALTER TABLE "AgentInterrupt" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);
ALTER TABLE "AgentInterrupt" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

CREATE INDEX IF NOT EXISTS "Agent_isSynthetic_idx" ON "Agent"("isSynthetic");
CREATE INDEX IF NOT EXISTS "AgentInterrupt_deliveryState_idx" ON "AgentInterrupt"("deliveryState");
