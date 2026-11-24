-- Reconcile the measured hosted catalog with prisma/schema.prisma.
-- Source: read-only prisma migrate diff from the hosted DATABASE_URL on
-- 2026-11-24; legacy tables already existed and were not recreated.
-- This migration is intentionally idempotent for clone rehearsal and
-- provider retry recovery. It does not delete or rewrite existing records.

BEGIN;

ALTER TABLE "AgentInterrupt"
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "claimOwner" TEXT,
  ADD COLUMN IF NOT EXISTS "claimToken" TEXT,
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AuthenticatedIdentity" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "secretCiphertext" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthenticatedIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RequestNonce" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestNonce_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseCode" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthenticatedIdentity_keyId_key"
  ON "AuthenticatedIdentity"("keyId");
CREATE INDEX IF NOT EXISTS "AuthenticatedIdentity_active_idx"
  ON "AuthenticatedIdentity"("active");
CREATE INDEX IF NOT EXISTS "RequestNonce_expiresAt_idx"
  ON "RequestNonce"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "RequestNonce_identityId_nonce_key"
  ON "RequestNonce"("identityId", "nonce");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx"
  ON "IdempotencyRecord"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_identityId_key_key"
  ON "IdempotencyRecord"("identityId", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "AgentInterrupt_claimToken_key"
  ON "AgentInterrupt"("claimToken");
CREATE INDEX IF NOT EXISTS "AgentInterrupt_status_availableAt_idx"
  ON "AgentInterrupt"("status", "availableAt");
CREATE INDEX IF NOT EXISTS "AgentInterrupt_leaseExpiresAt_idx"
  ON "AgentInterrupt"("leaseExpiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RequestNonce_identityId_fkey'
  ) THEN
    ALTER TABLE "RequestNonce"
      ADD CONSTRAINT "RequestNonce_identityId_fkey"
      FOREIGN KEY ("identityId") REFERENCES "AuthenticatedIdentity"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IdempotencyRecord_identityId_fkey'
  ) THEN
    ALTER TABLE "IdempotencyRecord"
      ADD CONSTRAINT "IdempotencyRecord_identityId_fkey"
      FOREIGN KEY ("identityId") REFERENCES "AuthenticatedIdentity"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
