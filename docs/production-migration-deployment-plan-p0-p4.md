# Production migration and deployment plan — P0–P4 review package

Status: **draft; not an execution authorization**. The steps below are a
bounded plan for review. No production database, credentials, deployment, or
Linear project structure is changed by this document.

## 1. Entry gates and ownership

The release owner records a release receipt containing the commit SHA, schema
checksum, migration tree checksum, build command, endpoint contract version,
staging database identity, and test results. Brian approves the promotion
decision. The operator follows the exact approved scope and stops on any
unexpected result. June/Dispatch may report evidence but may not approve,
schedule, or execute the P4 operation.

Before proceeding, all of these must be true:

- a complete migration inventory has been reviewed; `npm run db:check` passes;
- a disposable or restored staging database has passed `prisma migrate deploy`;
- the current production Git SHA, schema/migration state, and connected
  database identity are recorded from authoritative sources;
- a tested backup/restore point and a named rollback owner exist;
- endpoint/authentication and backward-compatibility tests pass;
- Brian has provided an operation-specific approval satisfying the P4 token
  requirements in the authority policy.

## 2. Existing database reconciliation (read first, write last)

1. **Freeze the baseline at P0/P1.** Record the production database provider,
   logical database identity, migration table, application SHA, and UTC/ET
   observation time without printing `DATABASE_URL`, session secrets, or key
   material.
2. **Inventory three views.** Compare (a) `prisma/schema.prisma`, (b) every
   checked-in `prisma/migrations/*/migration.sql`, and (c) the live catalog and
   `_prisma_migrations` table. Produce a model/table/column/index/constraint
   diff with an owner for every discrepancy.
3. **Classify drift.** Separate applied migrations, unapplied committed
   migrations, live objects absent from source, source objects absent from the
   database, unsafe destructive drift, and unknown/manual objects. Do not
   mark the database clean from a partial inventory.
4. **Reconcile on a clone first.** Take a verified backup or provider snapshot,
   restore it into isolated staging, and rehearse the proposed migration from
   the exact current baseline. Resolve missing historical migrations by a
   reviewed baseline/mark-applied procedure; never use `prisma db push` to hide
   drift.
5. **Use expand/contract.** Add nullable or additive structures first; deploy a
   compatibility reader/writer; backfill in bounded batches with observability;
   validate counts/checksums and constraints; only then enforce constraints or
   remove legacy structures in a separately approved release.
6. **Write a reconciliation receipt.** Include counts, anomalies, SQL/migration
   identifiers, lock/timeout settings, backup identifier, and read-back results.
   Any unknown or destructive drift blocks P4.

No production migration is in scope for this worktree. Existing records are
not assumed to be authentic merely because an endpoint returned 2xx.

## 3. Endpoint security gate

Before promotion, review every route, not only ingestion:

| Surface | Required boundary | Acceptance evidence |
| --- | --- | --- |
| Session login/register | Rate-limited human session; no secret in response/logs; CSRF/session-cookie policy reviewed. | unauthenticated, invalid, expired, and authorized matrices |
| Identity registration/rotation | Session/operator-only; one-time secret delivery; secret encrypted at rest; revocation tested. | registration, revoke, rotation, and lost-secret tests |
| Heartbeat/event/cost ingest | Identity-bound HMAC; fresh timestamp; unique nonce; body bounds; idempotency; no private payloads. | tamper, replay, duplicate, stale, oversized, and cross-identity tests |
| Agent/activity/error/cost reads | Authenticated read; workspace/agent scope enforced; pagination and rate limits. | anonymous and cross-scope denial tests |
| Interrupt create/claim/ack/retry | Authenticated operator/agent capability; atomic claim; lease; expiry; acknowledgment; audit record. | concurrent claim, wrong owner/token, lease expiry, retry, and expiration tests |
| Framework/static/health routes | Explicitly classified public or private; no accidental database-backed public read. | route inventory and unauthenticated scan |

Reject unknown methods/content types, bound request size and metadata depth,
avoid logging bodies/signatures/secrets, and use constant-time signature
comparison. A browser session must not be a fallback for a partially supplied
agent credential. Rate-limit authentication and control surfaces. CORS/CSRF,
proxy headers, TLS, and cache behavior must be verified in the target hosting
environment.

## 4. Backward compatibility

- Preserve existing successful response shapes and status codes for supported
  clients; add fields rather than repurposing or removing them.
- Keep old read paths available through the expand phase, but do not preserve
  an unsafe unauthenticated write path merely for compatibility. Old clients
  must receive a documented `401`/`403` and upgrade guidance.
- Accept the prior supported adapter envelope only behind a staging-tested
  compatibility flag with an expiry and metrics. New identity/signature headers
  are required before production writes.
- Make writes idempotent across retries; distinguish accepted/delivered from
  acknowledged/executed. Preserve old records and timestamps during backfill.
- Roll out in order: schema expand → compatible app → client/adapters →
  enforcement → contract cleanup. Do not combine destructive cleanup with the
  first enforcement release.

## 5. Deployment and rollback sequence

### Staging (P2/P3, separately approved)

1. Build from the pinned commit with database-free `npm run build`.
2. Apply only the reviewed migration with `npm run db:migrate:deploy` to the
   isolated staging target.
3. Run synthetic lifecycle, security, compatibility, and dashboard tests.
4. Capture release receipt, migration read-back, logs, and test artifacts.

### Production (P4, not authorized here)

1. Reconfirm the approval token, backup freshness, target identity, checksums,
   maintenance/lock budget, and stop conditions immediately before action.
2. Enable observability and a kill switch; deploy the compatible application.
3. Apply the reviewed migration as a separate explicit operation; never from a
   build hook and never with `prisma db push`.
4. Verify schema read-back, endpoint auth matrix, error rate, latency, ingest
   idempotency, and interrupt claim/ack behavior. Compare to the baseline.
5. Announce only verified facts to the approving human; do not claim agent
   execution without authenticated read-back.

### Rollback

- **Application-only failure:** stop traffic or disable the feature flag and
  revert to the last compatible app artifact; retain the additive schema.
- **Migration failure before commit:** stop, preserve logs, inspect locks, and
  use the migration tool/provider-supported recovery procedure. Do not retry
  blindly.
- **Committed additive migration with bad behavior:** roll back the app and
  issue a forward corrective migration after review; do not drop data to make
  the old app fit.
- **Destructive/data-integrity incident:** stop writes, invoke the named owner,
  preserve evidence, and restore only under a new explicit approval after
  assessing data loss and point-in-time recovery. Rollback is never implicit.

## 6. Acceptance tests

The staging gate is green only when it covers:

- authenticated identity registration and revocation;
- valid signature, wrong signature, wrong identity, stale timestamp, nonce
  replay, body tamper, oversized body, and missing idempotency key;
- same-key same-request replay returns the recorded result, while same-key
  different-request is rejected;
- authenticated reads reject anonymous and cross-scope callers;
- concurrent interrupt claims yield one winner; active leases suppress duplicate
  delivery; expired leases can be reclaimed;
- acknowledgment is distinct from delivery; wrong token/owner is rejected;
- retry/backoff, expiration, disconnected-agent recovery, and duplicate
  suppression;
- legacy client read compatibility and intentional denial of unsafe writes;
- migration apply/read-back, backup restore rehearsal, schema drift check,
  release provenance, and dashboard behavior;
- no test sends private conversation content or a valid synthetic credential to
  production.

## 7. Explicit non-goals and remaining risks

This plan does not choose public-read policy, create a production migration,
rotate credentials, deploy Vercel/Neon, send live interrupts, or reorganize
Linear. Remaining risks are unknown production schema drift, incomplete
authoritative deployment provenance, target-environment proxy/rate-limit
configuration, the exact dashboard 500 cause, and any client that still relies
on the old public behavior. Each is a release blocker until evidenced in
staging or explicitly accepted by Brian.

## 8. Read-only hosted reconciliation — 2026-11-24

The existing hosted Neon database was inspected without mutation. It contains
the `Agent`, `AgentHeartbeat`, `AgentEvent`, `AgentCostEvent`, `AgentInterrupt`,
`ContentItem`, `User`, `Workspace`, and `LogEntry` tables, but
`_prisma_migrations` records only the two historical migrations:

- `20260220181620_init_user_workspace_logentry`
- `20260220183955_add_updated_at_cascade`

The staging baseline migration `20261124175650_dispatch_staging_baseline` is
not recorded as applied. A read-only `prisma migrate diff` from the hosted
catalog to the current schema produced an 82-line diff, SHA-256
`cdc9fa409b9bb77c22ae1f81e86eeb69fc7b3f10c0a90186e69789bd31a48da4`. It adds
the authenticated identity, nonce, and idempotency tables and the new
interrupt lifecycle columns. Because the hosted database already contains the
legacy agent tables, the staging baseline cannot be blindly deployed there:
its create-table operations are not a safe production reconciliation.

Production remains blocked until a reviewed, idempotent reconciliation
migration is prepared from this exact catalog state, rehearsed against a
restored clone, and separately authorized. No `migrate deploy`, `db push`,
schema write, or data write was performed.

