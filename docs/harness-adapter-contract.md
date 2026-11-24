# Harness-independent adapter contract

Status: isolated development contract and synthetic test stub. This change does not add a production adapter, ingestion route, scheduler, executor, or control path.

## Normalized observation

Every harness adapter maps one harness observation to `NormalizedExecution`:

| Field | Contract | Rule |
| --- | --- | --- |
| `identity.harness` | `hermes`, `codex-cli`, `claude-code`, or namespaced extension | Adapter identity, not a user name |
| `identity.sessionId` | non-empty harness-issued/assigned opaque ID | Never derive from prompt text, credentials, or machine paths |
| `identity.parentSessionId` | optional opaque ID | Set only when resume/fork lineage is explicitly known |
| `state` | queued/running/completed/failed/cancelled/unknown | Unknown is valid; do not infer completion from process exit alone |
| `model` | provider/model plus source | Use provider-reported when emitted; otherwise unavailable |
| `tokens` | input/output/cached-input/reasoning/total plus source | Preserve nulls; total is not synthesized unless the required components are present |
| `cost` | USD/null plus source | Source is exactly measured, provider-reported, estimated, or unavailable |
| `observedAt` | ISO-8601 timestamp | Timestamp of local observation, not claimed provider time |

The contract is observation-only. It must not accept private prompts, tool output, credentials, control commands, or arbitrary conversation payloads. It has no network client and no credential lookup.

## Source semantics

- **measured**: calculated from locally measured usage and a documented price table or invoice source.
- **provider-reported**: emitted by the harness/provider as usage or cost.
- **estimated**: a clearly labeled estimate; never replace a reported value.
- **unavailable**: no defensible value was exposed. Use `null`, not zero.

Token totals may be calculated from explicit input + output counts, but this does not change the token source. Cost must never be inferred from a model name alone.

## Harness requirements observed locally

The following are CLI surface observations only; no session was started and no credential or network-control operation was performed.

| Harness | Local version | Session identity / lifecycle surface | Output surface relevant to adapter | Requirement for a real adapter |
| --- | --- | --- | --- | --- |
| Hermes | `0.12.0` | `--resume SESSION`, `--continue [SESSION_NAME]`, `sessions` store, ACP mode | Session store/ACP integration must be inspected for stable IDs and terminal events | Bind an ID from Hermes output/store; do not use title as identity; confirm where provider usage/cost is emitted |
| Codex CLI | `0.160.1` | `exec`, `exec resume`, `resume`, `fork`; local app-server sessions | `codex exec --json` emits JSONL events | Consume JSONL schema and terminal event; map thread ID and reported usage/model; do not use remote-control/cloud paths for this contract |
| Claude Code | `2.1.330` | `--resume`, `--continue`, `--fork-session`, `--no-session-persistence` | `-p --output-format json` or `stream-json`; include hook events is available | Consume structured output/session metadata; distinguish ephemeral sessions; verify whether usage/cost is present before reporting |

These surfaces establish adapter inputs to investigate, not proof that the current Dispatch app receives any of them. The existing Dispatch docs and implementation contain no first-class Hermes, Codex CLI, or Claude Code adapter.

## Hermes stub boundary

`tests/stubs/hermes-adapter.ts` accepts a small synthetic Hermes-shaped event and normalizes it. It intentionally has no subprocess invocation, environment loading, HTTP client, credential access, or production import. The tests cover complete usage, omitted fields, estimated cost preservation, and required identity.

## Acceptance gates before any future integration

1. Obtain a documented, credential-safe sample event for each harness.
2. Prove stable session identity across one resume/fork case per harness.
3. Prove terminal state mapping and retry/duplicate behavior in isolated staging.
4. Prove usage/model/cost provenance with fixtures; unavailable remains unavailable.
5. Add authenticated ingestion and replay/idempotency handling only through a separately reviewed staging change.
