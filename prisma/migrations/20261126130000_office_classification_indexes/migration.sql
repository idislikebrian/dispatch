ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "classification" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "classificationEvidence" TEXT;

CREATE INDEX IF NOT EXISTS "Agent_classification_idx" ON "Agent"("classification");
CREATE INDEX IF NOT EXISTS "AgentInterrupt_deliveryState_idx" ON "AgentInterrupt"("deliveryState");
