# Office Phase 1 release checkpoint

## Scope

This checkpoint covers the additive Office data-integrity pass only. It does not
include the larger Office experience rebuild, Agent Economy UI, production
deployment, or production migration execution.

## Changes

- mark seed fixtures with `Agent.isSynthetic` and exclude them from production
  agent, activity, and cost views by default;
- preserve synthetic and historical rows for audit through the explicit
  `includeSynthetic=true` read path;
- expose responsibility, harness, objective reference, connectivity,
  telemetry freshness, execution state, and unavailable metric states;
- add interrupt delivery lifecycle fields without changing or deleting existing
  queue records;
- align the June adapter test contract with the v1 request signer already used
  by the deployed reporter;
- disable unsupported Office controls until delivery, acknowledgement,
  execution, and failure receipts are actually wired.

## Migration safety

`20261126110000_office_data_integrity` is additive only:

- four nullable or defaulted columns on `Agent`;
- five nullable or defaulted columns on `AgentInterrupt`;
- two indexes;
- no table drops, column drops, deletes, truncation, or data rewriting.

Existing production rows retain their data. Existing rows default to
`isSynthetic=false`, so genuine registered agents remain visible. Seed fixtures
are explicitly marked synthetic on seed upsert and are excluded from production
views without destructive cleanup.

## Verification completed

- 18/18 synthetic tests passed;
- production build passed in the isolated worktree;
- Prisma schema validation passed;
- `git diff --check` passed;
- desktop/mobile layout rules remain modular and responsive: the Office middle
  row stacks below 760px and the agent grid uses responsive minimum columns.

## Required before production migration/deploy

1. Run a read-only production inventory of `Agent`, heartbeat, event, cost, and
   interrupt counts plus duplicate/stale classifications.
2. Verify the production database backup or provider snapshot and record its
   recovery identifier.
3. Apply the migration in the approved release window, then read back genuine
   agents, excluded synthetic fixtures, and the new default values.
4. Configure `LINEAR_API_KEY` in Vercel Production through the owner-managed
   secret path, then run the authenticated Linear sync and verify snapshot
   counts/integrity.
5. Verify authenticated telemetry with the existing identity; do not rotate
   credentials as part of this release.

No production migration, deployment, credential change, or destructive cleanup
was performed by this checkpoint.
