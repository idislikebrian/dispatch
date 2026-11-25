# telemetry read-back and Linear mirror

## telemetry

Authenticated identities may be granted `telemetry:read` in addition to their
write permissions. A signed `GET /api/telemetry/readback` returns only the
bound agent's recent heartbeats and runtime events. `GET /api/agents` and
`GET /api/activity` apply the same agent scope to identity-authenticated
requests; browser sessions retain the operator-wide view.

The identity is still HMAC-authenticated with the existing timestamp and nonce
checks. No secret is returned by the read endpoints. A reporter can use the
read-back response to distinguish accepted ingestion from durable persistence.

## Linear

`POST /api/integrations/linear/sync` reads issues from Linear's GraphQL API and
writes a local `LinearIssueSnapshot` mirror. Linear is never mutated. The
route requires an authenticated Dispatch operator session and reads
`LINEAR_API_KEY` only on the server. Optional `LINEAR_TEAM_ID` or
`LINEAR_PROJECT_ID` narrows the query. `GET /api/integrations/linear/issues`
serves the local snapshot for the dashboard.

Missing issues are archived in the local mirror rather than deleted. The sync
is therefore repeatable and preserves historical references.
