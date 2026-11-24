# Local harness integration findings — 2026-11-24

Scope: local executable discovery and read-only help/version inspection. No credentials were read, no harness session was started, and no network/control call was made.

## Verified locally

- `/usr/local/bin/hermes` is installed as Hermes Agent `0.12.0`; help exposes `--resume`, `--continue`, `--pass-session-id`, `acp`, and a SQLite-backed `sessions` command family. The service unit runs `gateway run --replace` with `HERMES_HOME=/root/.hermes`.
- `/usr/bin/codex` is installed as `codex-cli 0.160.1`; help exposes `exec --json`, `exec resume`, `resume`, `fork`, and app-server/remote-control commands. This work does not use the latter control surfaces.
- `/root/.local/bin/claude` is installed as Claude Code `2.1.330`; help exposes `-p`, `--output-format json|stream-json`, `--resume`, `--continue`, `--fork-session`, and `--no-session-persistence`.
- Dispatch’s current checked-in implementation has the signed June telemetry builder only. Its readiness audit explicitly records that no concrete Hermes, Claude Code, or Codex-to-Dispatch adapter was found.

## Not verified

- No provider API response shape, token accounting field, cost field, or stable session-ID guarantee was verified for Hermes, Codex CLI, or Claude Code.
- No claim is made that CLI help output implies a supported Dispatch integration.
- No credentials, config values, session databases, logs, provider calls, gateway calls, remote-control calls, or network endpoints were inspected or invoked.

The contract therefore uses explicit null/unavailable values and requires future adapters to supply fixture-backed evidence before making stronger attribution claims.
