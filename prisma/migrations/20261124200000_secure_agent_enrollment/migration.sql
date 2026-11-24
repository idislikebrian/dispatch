CREATE TABLE "EnrollmentRequest" (
  "id" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "harness" TEXT NOT NULL,
  "project" "Project",
  "requestedPermissions" JSONB NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "identityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnrollmentRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnrollmentRequest_tokenHash_key" ON "EnrollmentRequest"("tokenHash");
CREATE INDEX "EnrollmentRequest_status_expiresAt_idx" ON "EnrollmentRequest"("status", "expiresAt");
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AuthenticatedIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
