# Dispatch implementation policy

For Dispatch work, use an isolated development branch and synthetic staging infrastructure first. Production deployment, production database mutation, credential changes, live agent control, additional spending, and materially irreversible changes require Brian's explicit approval.

The normal engineering sequence is: inspect the existing implementation and historical decisions; generate and review explicit Prisma migrations; apply them only to isolated staging; run synthetic security and end-to-end lifecycle tests; record release provenance; then prepare a bounded review package. Never restore `prisma db push` to a build command.

The staging acceptance loop must cover authenticated identity registration, signed ingestion, timestamp/nonce replay protection, idempotency, authenticated reads, atomic interrupt claims, leases, duplicate suppression, retry/backoff, acknowledgment, expiration, disconnected-agent recovery, and dashboard behavior. Distinguish command delivery from acknowledged execution. Dispatch remains observation-only; it does not become an agent executor or scheduler.

Coordinate resource use with Mateo and avoid adding a second resource-intensive stack on the shared VPS. Do not transmit private conversation content or operational evidence in synthetic adapter tests.
