CREATE TABLE "LinearIssueSnapshot" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT,
    "teamKey" TEXT,
    "projectName" TEXT,
    "priority" INTEGER,
    "url" TEXT,
    "dueDate" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LinearIssueSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LinearIssueSnapshot_identifier_key" ON "LinearIssueSnapshot"("identifier");
CREATE INDEX "LinearIssueSnapshot_status_idx" ON "LinearIssueSnapshot"("status");
CREATE INDEX "LinearIssueSnapshot_sourceUpdatedAt_idx" ON "LinearIssueSnapshot"("sourceUpdatedAt");
