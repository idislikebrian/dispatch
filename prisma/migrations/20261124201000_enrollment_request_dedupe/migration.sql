ALTER TABLE "EnrollmentRequest" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "EnrollmentRequest_dedupeKey_key" ON "EnrollmentRequest"("dedupeKey");
