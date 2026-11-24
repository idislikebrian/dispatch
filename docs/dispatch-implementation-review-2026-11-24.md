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

## isolated staging verification — follow-up

The missing migration blocker was resolved in isolated infrastructure only. A local PostgreSQL 16 container named `dispatch-staging-postgres` was provisioned on port `55432` with synthetic-only credentials; no production `.env` or hosted database was used. Migration `20261124175650_dispatch_staging_baseline` was generated and applied with `prisma migrate deploy`.

- `npm run db:check`: passed for 12 models.
- `npm run test:synthetic`: 4 passed.
- `npm run test:security`: passed.
- `npm run test:staging:e2e`: passed.
- End-to-end coverage: session-gated identity registration; signed heartbeat and event; nonce replay rejection; persisted idempotency-key replay rejection; authenticated agent read; command claim; active-lease duplicate suppression; retry/backoff/reclaim; acknowledgment; and expiration.
- A real staging bug was found and fixed: agent credentials now take precedence over a browser session cookie, preventing replayed or forged agent requests from falling through to human-session authentication.

The lifecycle harness uses only synthetic agent names, messages, and project data. This demonstrates a working isolated staging execution lifecycle, not production readiness. Production promotion still requires migration review, deployment provenance, live service configuration review, and Brian's approval.

## milestone 2 — genuine isolated execution and cross-harness foundation

The June adapter now runs a complete synthetic control loop against the isolated staging deployment. A claimed command is linked to an OpenClaw harness session ID, synthetic tool execution ID, output artifact path and SHA-256, measured test token/cost fields, completion or failure state, and the subsequent acknowledgment or retry. The read-back assertions verify the completion and failure events in Dispatch rather than treating an HTTP response as execution proof.

Integrated commits:

- `7999e33` — June command execution evidence loop and recovery harness.
- `11085b2` — harness-independent adapter contract, Hermes-shaped isolated stub, and Codex/Claude requirements findings (sidecar source `a44bd45`).
- `f5af5a9` — P0–P4 delegated authority policy, production migration/deployment plan, and seven synthetic policy tests (sidecar source `4a74023`).
- `b61aa0e` — adapter evidence contract hardening.

The cross-harness contract normalizes harness/session identity, execution state, command identity, model attribution, token usage, cost, and telemetry source. It preserves `measured`, `provider-reported`, `estimated`, and `unavailable` rather than upgrading missing data. Hermes, Codex CLI, and Claude Code versions were detected locally without credentials, sessions, provider calls, or control requests; no first-class production adapter was inferred.

The authority model is persisted in `AGENTS.md` and `docs/delegated-authority-policy.md`: P0 read-only, P1 isolated engineering, P2 bounded reversible, P3 owner-authorized production milestone, and P4 individually authorized destructive operation. Objective boundaries, budgets, acceptance criteria, and escalation conditions remain explicit.

Remaining production gates: migration review against the existing hosted schema, deployment/proxy/rate-limit configuration, backward-compatible rollout and rollback rehearsal, dashboard diagnosis with production-equivalent logs, credential provisioning, and explicit production authorization. No live agent control or production mutation occurred.

## milestone 3 — authenticated landing-route release preparation

Production route verification identified a separate client-side defect on the deployed main commit `606b6c6`: the login page pushed authenticated users to `/tasks`, but the actual authenticated route tree defines `/dashboard` and `/dashboard/tasks`; `/tasks` returned a genuine 404. The intended authenticated landing page is `/dashboard`, which is wrapped by the existing authenticated dashboard layout.

Fix commit: `caa5bb7` — login now pushes to `/dashboard`; a route-contract test asserts the target exists and the legacy `/tasks` target is absent. The staging end-to-end harness now also asserts that an authenticated session reaches `/dashboard` with HTTP 200. The fix does not alter session validation or weaken the dashboard auth boundary.

Read-only production probes observed `/tasks` as 404. An unauthenticated `/dashboard` probe returned 500 from the current deployment, so production-equivalent Vercel runtime logs/configuration must be checked during the P3 release gate; this was not treated as solved by the redirect patch. The release package must verify login, session persistence, `/dashboard` navigation, and dashboard access on the deployed commit after promotion.

No production deployment has occurred. P3 approval remains required for promotion; production acceptance is: iPhone login lands directly on a functional `/dashboard`, session persistence survives navigation, unauthenticated access still redirects to `/`, and the deployed commit is verified to contain `caa5bb7` or its release descendant.
