-- CreateEnum
CREATE TYPE "Project" AS ENUM ('Cobalt', 'Caminos', 'HIGHER', 'Aluminum', 'Experimental', 'TTABLE', 'AYDAF', 'DiligentProcrastination');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('substack', 'warpcast', 'threads', 'bluesky', 'youtube', 'instagram', 'other');

-- CreateEnum
CREATE TYPE "ContentStage" AS ENUM ('idea', 'draft', 'editing', 'scheduled', 'published', 'repurposed', 'archived');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('human', 'agent');

-- CreateTable
CREATE TABLE "AuthenticatedIdentity" (
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

-- CreateTable
CREATE TABLE "RequestNonce" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
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

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "project" "Project",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentHeartbeat" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "project" "Project",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCostEvent" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "eventId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "project" "Project",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCostEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInterrupt" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "claimToken" TEXT,
    "claimOwner" TEXT,
    "claimedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentInterrupt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "project" "Project" NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "stage" "ContentStage" NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL,
    "summary" TEXT,
    "sourceIdea" TEXT,
    "relatedEventId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthenticatedIdentity_keyId_key" ON "AuthenticatedIdentity"("keyId");

-- CreateIndex
CREATE INDEX "AuthenticatedIdentity_active_idx" ON "AuthenticatedIdentity"("active");

-- CreateIndex
CREATE INDEX "RequestNonce_expiresAt_idx" ON "RequestNonce"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestNonce_identityId_nonce_key" ON "RequestNonce"("identityId", "nonce");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_identityId_key_key" ON "IdempotencyRecord"("identityId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_project_idx" ON "Agent"("project");

-- CreateIndex
CREATE INDEX "AgentHeartbeat_agentId_idx" ON "AgentHeartbeat"("agentId");

-- CreateIndex
CREATE INDEX "AgentHeartbeat_agentId_createdAt_idx" ON "AgentHeartbeat"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvent_agentId_idx" ON "AgentEvent"("agentId");

-- CreateIndex
CREATE INDEX "AgentEvent_createdAt_idx" ON "AgentEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AgentEvent_agentId_createdAt_idx" ON "AgentEvent"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvent_project_idx" ON "AgentEvent"("project");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCostEvent_eventId_key" ON "AgentCostEvent"("eventId");

-- CreateIndex
CREATE INDEX "AgentCostEvent_agentId_idx" ON "AgentCostEvent"("agentId");

-- CreateIndex
CREATE INDEX "AgentCostEvent_createdAt_idx" ON "AgentCostEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AgentCostEvent_agentId_createdAt_idx" ON "AgentCostEvent"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentCostEvent_project_idx" ON "AgentCostEvent"("project");

-- CreateIndex
CREATE UNIQUE INDEX "AgentInterrupt_claimToken_key" ON "AgentInterrupt"("claimToken");

-- CreateIndex
CREATE INDEX "AgentInterrupt_agentId_idx" ON "AgentInterrupt"("agentId");

-- CreateIndex
CREATE INDEX "AgentInterrupt_agentId_status_idx" ON "AgentInterrupt"("agentId", "status");

-- CreateIndex
CREATE INDEX "AgentInterrupt_status_availableAt_idx" ON "AgentInterrupt"("status", "availableAt");

-- CreateIndex
CREATE INDEX "AgentInterrupt_leaseExpiresAt_idx" ON "AgentInterrupt"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "ContentItem_project_idx" ON "ContentItem"("project");

-- CreateIndex
CREATE INDEX "ContentItem_stage_idx" ON "ContentItem"("stage");

-- CreateIndex
CREATE INDEX "ContentItem_platform_idx" ON "ContentItem"("platform");

-- CreateIndex
CREATE INDEX "ContentItem_ownerName_idx" ON "ContentItem"("ownerName");

-- CreateIndex
CREATE INDEX "ContentItem_createdAt_idx" ON "ContentItem"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContentItem_project_stage_idx" ON "ContentItem"("project", "stage");

-- CreateIndex
CREATE INDEX "ContentItem_relatedEventId_idx" ON "ContentItem"("relatedEventId");

-- AddForeignKey
ALTER TABLE "RequestNonce" ADD CONSTRAINT "RequestNonce_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AuthenticatedIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AuthenticatedIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentHeartbeat" ADD CONSTRAINT "AgentHeartbeat_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCostEvent" ADD CONSTRAINT "AgentCostEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCostEvent" ADD CONSTRAINT "AgentCostEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AgentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInterrupt" ADD CONSTRAINT "AgentInterrupt_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "AgentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
