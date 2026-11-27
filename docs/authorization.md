# Authorization

Every API route decides access on the server. The interface hiding or disabling a
control is never the restriction. The enforced contract is
`tests/authorization-matrix.ts`; adding a handler without listing it fails CI.

## Who can call

- **Anonymous**: no credential.
- **Account**: a signed-in session. By itself it grants nothing.
- **Operator**: a signed-in session whose user id is listed in
  `DISPATCH_OPERATOR_USER_IDS` and still exists in the database.
- **Agent**: an HMAC-signed request from an identity bound to one agent, limited
  to the permissions granted to it. Signed headers take precedence over cookies.

## Matrix

| Route | Methods | Kind | Anonymous | Account | Operator | Agent |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/login`, `/api/auth/logout` | POST | public | yes | yes | yes | n/a |
| `/api/auth/enroll` | POST | write | signed invitation | signed invitation | signed invitation | n/a |
| `/api/auth/identities` | GET | admin read | 401 | 403 | yes | 403 |
| `/api/auth/identities`, `/api/auth/identities/[id]` | POST, PATCH | admin write | 401 | 403 | yes | 403 |
| `/api/enrollment/requests` | GET | admin read | 401 | 403 | yes | 403 |
| `/api/enrollment/requests/[id]` | POST | admin write | 401 | 403 | yes | 403 |
| `/api/enrollment/requests`, `/api/enrollment/exchange` | POST | write | only while enrollment is on | same | same | n/a |
| `/api/agents`, `/api/activity`, `/api/cost/summary`, `/api/errors`, `/api/telemetry/readback` | GET | read | 401 | 403 | all agents | `telemetry:read`, own agent |
| `/api/ingest/heartbeat` | POST | write | 401 | 403 | 403 | `heartbeat:write`, own agent |
| `/api/ingest/event` | POST | write | 401 | 403 | 403 | `events:write`, own agent and project |
| `/api/ingest/cost` | POST | write | 401 | 403 | 403 | `costs:write`, own agent, project and events |
| `/api/content`, `/api/content/summary` | GET | read | 401 | 403 | yes | 403 |
| `/api/content`, `/api/content/[id]` | POST, PATCH | write | 401 | 403 | yes | 403 |
| `/api/integrations/linear/issues` | GET | read | 401 | 403 | yes | 403 |
| `/api/integrations/linear/sync` | POST | admin write | 401 | 403 | yes | 403 |
| `/api/interrupt` | POST | admin write | 401 | 403 | only while interrupts are on | 403 |
| `/api/interrupt` | GET, PATCH | write | 401 | 403 | 403 | `interrupts:claim`, own agent, only while interrupts are on |
| `/dashboard/**` | pages | read | to login | to login | yes | to login |

## Settings

All fail closed when unset.

| Variable | Effect |
| --- | --- |
| `DISPATCH_OPERATOR_USER_IDS` | Comma-separated operator user ids. Required for a production deploy. |
| `DISPATCH_ENROLLMENT_SECRET` | 32+ characters. Enables invitation-based account creation. |
| `DISPATCH_AGENT_ENROLLMENT_ENABLED` | `true` opens the agent enrollment request and exchange endpoints. |
| `DISPATCH_INTERRUPTS_ENABLED` | `true` allows interrupt creation and delivery. |

## Operating

**Invite an account.** Set `DISPATCH_ENROLLMENT_SECRET` on the deployment and,
in a shell that reads the same value from a protected source, run
`npm run enroll:invite -- person@example.com 1`. The invitee posts `email`,
`password` (12 to 72 characters) and `token` to `/api/auth/enroll`. Unset the
secret afterwards. A new account is not an operator until its id is allowlisted.

**Enrol an agent.** Turn agent enrollment on, let the runtime file its request,
approve it, then turn it off. Approval never reissues the credential of an agent
that already has one; rotate it from agent management instead.

**Sessions.** Sessions are sealed cookies with a 14 day lifetime and no server
side store. Removing an id from the operator list (and redeploying) or deleting
the user ends operator access immediately. Invalidating every cookie requires
changing `SESSION_SECRET`.

## Database commands

`prisma.config.ts` and the seed script refuse development or destructive commands
unless every database URL is local or its host is listed in
`DISPATCH_DISPOSABLE_DB_HOSTS`. `generate`, `validate`, `migrate status`,
`migrate deploy` and `migrate resolve` are unaffected. This prevents accidents;
it does not replace separate database credentials for development.

## Tests

```bash
npm run test:synthetic                  # matrix coverage, settings, guard
npm run build && npm run test:authz     # every route over HTTP, local database
npm run test:authz:remote               # same checks against an isolated deployment
```
