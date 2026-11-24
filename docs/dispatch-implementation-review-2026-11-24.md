# Dispatch isolated implementation review — 2026-11-24

## scope

This package records the first isolated implementation pass based on `dispatch-readiness-audit-2026-11-24.md`. Work was performed on the dedicated local branch `release-safety-dashboard-diagnosis` with synthetic tests only. No production deployment, production database connection, migration, credential change, live interrupt, or Linear project restructuring occurred.

## implemented commits

1. `c34fe5b` — isolated signed June adapter contract.
   - Harness-independent public telemetry envelope.
   - HMAC signature, timestamp, nonce, idempotency key, bounded message/project fields.
   - Explicitly rejects private conversation/tool payloads.
2. `a7c3df6` — release safety and office diagnosis.
   - Removed `prisma db push` from the build command.
   - Added explicit `db:migrate:deploy` and repository-only migration inventory checks.
   - Added release provenance check/receipt tooling.
   - Added synthetic diagnosis for the office 500 (`P2021` missing-table path).
   - Added focused dashboard diagnostic tests and deployment documentation.
3. `73c2c19` — authenticated identity and interrupt lifecycle.
   - Added identity registration, encrypted one-time secrets, HMAC freshness/nonce checks, idempotency records, and authenticated route boundaries.
   - Added interrupt claim tokens, leases, expiration, attempts, acknowledgment state, and retry-oriented lifecycle primitives.
   - Added synthetic security tests.

## verification receipt

- `npm run test:synthetic`: **4 passed**.
- `npm run test:security`: **passed**.
- `npm run release:check`: **passed**.
- `npm run build`: **passed** without database mutation.
- Provenance output recorded:
  - branch: `release-safety-dashboard-diagnosis`
  - commit at check: `899d30e4cb53129593bddd488443ff295878d506`
  - schema SHA-256: `032b6ad74680fa72c9139d4728ab674a8c3a7ca01ae21b68c96492cd253274de`
  - migrations tree SHA-256: `fd81375f046f20d822f1a812c1960c98d0f8b9dee2a7c4860941edbfe66d1da2`
  - build command: `prisma generate && next build`
  - `databaseMutationInBuild`: `false`
- `npm run db:check`: **fails closed**. Several schema models have no committed CREATE TABLE migration, including the new identity/idempotency models and existing agent/event models. This is a production-readiness blocker, not a reason to run `db push`.

## dashboard 500

The isolated diagnostic reproduces the known failure class without a database: the `/dashboard/office` data path can surface Prisma `P2021` when the `Agent` table is absent. This explains a likely deployment failure mode but does not claim that every live 500 has been fully root-caused. The next proof step is a non-production deployment with logs and an explicitly migrated staging database.

## security and provenance status

The code now has a development contract for authenticated ingestion and durable interrupt state, but the live deployment still has the old public behavior until an approved deployment and migration occur. The new HMAC headers are not authorization to send data to production. Registration-secret handling, nonce persistence, idempotency, and interrupt state require a reviewed staging migration before runtime acceptance.

The June adapter proves request construction and tamper rejection only. It does not claim a real OpenClaw execution, and it intentionally sends no private operational data. A later staging harness test must bind one stable June identity to a secret, verify request read-back, and separately record command delivery versus acknowledgment.

## remaining risks and approval gates

1. Create and review a complete migration history for all required models; apply only to an isolated staging database first.
2. Verify route authorization policy for public reads, registration, ingest, and interrupts.
3. Add staging integration tests for concurrent claims, lease expiry, retry, acknowledgment, replay, and idempotency.
4. Diagnose `/dashboard/office` with non-production logs and a valid/invalid session matrix.
5. Establish deployed Git SHA and schema receipt after staging deployment.
6. Obtain Brian's explicit approval before production code/config promotion, database migration, credential or connected-service changes, live telemetry/control calls, deployment, or rollback.

No Linear project restructuring was performed. Proposed reconciliation remains bounded to existing Dispatch issues: `COB-751` for the restoration work and `COB-768` for the supervised pilot.
