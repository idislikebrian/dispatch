ALTER TABLE "AuthenticatedIdentity" ADD COLUMN "agentId" TEXT;
ALTER TABLE "AuthenticatedIdentity" ADD COLUMN "project" "Project";
ALTER TABLE "AuthenticatedIdentity" ADD COLUMN "permissions" JSONB;
ALTER TABLE "AuthenticatedIdentity" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "AuthenticatedIdentity" ADD COLUMN "rotatedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "AuthenticatedIdentity_agentId_key" ON "AuthenticatedIdentity"("agentId");
ALTER TABLE "AuthenticatedIdentity" ADD CONSTRAINT "AuthenticatedIdentity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "IdentityAuditEvent" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentityAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IdentityAuditEvent_identityId_createdAt_idx" ON "IdentityAuditEvent"("identityId", "createdAt");
ALTER TABLE "IdentityAuditEvent" ADD CONSTRAINT "IdentityAuditEvent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AuthenticatedIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
