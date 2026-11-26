// The authorization contract for every API handler. A route that is missing
// here, or whose handler does not call the listed guard, fails the test suite.
export type Access =
  | 'public'            // reachable by anyone; must not expose or change shared data
  | 'invite'            // anonymous, requires an owner-signed invitation
  | 'enrollment-open'   // anonymous, only while agent enrollment is switched on
  | 'operator'          // allowlisted human operator
  | 'telemetry-read'    // operator, or agent with telemetry:read limited to itself
  | 'heartbeat:write' | 'events:write' | 'costs:write'  // bound agent, own records only
  | 'interrupt-create'  // operator, and interrupts enabled
  | 'interrupt-claim';  // target agent with interrupts:claim, and interrupts enabled

export const ROUTES: Record<string, Access> = {
  'POST /api/auth/login': 'public',
  'POST /api/auth/logout': 'public',
  'POST /api/auth/enroll': 'invite',
  'GET /api/auth/identities': 'operator',
  'POST /api/auth/identities': 'operator',
  'PATCH /api/auth/identities/[id]': 'operator',
  'POST /api/enrollment/requests': 'enrollment-open',
  'POST /api/enrollment/exchange': 'enrollment-open',
  'GET /api/enrollment/requests': 'operator',
  'POST /api/enrollment/requests/[id]': 'operator',
  'GET /api/content': 'operator',
  'POST /api/content': 'operator',
  'GET /api/content/summary': 'operator',
  'PATCH /api/content/[id]': 'operator',
  'GET /api/integrations/linear/issues': 'operator',
  'POST /api/integrations/linear/sync': 'operator',
  'GET /api/agents': 'telemetry-read',
  'GET /api/activity': 'telemetry-read',
  'GET /api/cost/summary': 'telemetry-read',
  'GET /api/errors': 'telemetry-read',
  'GET /api/telemetry/readback': 'telemetry-read',
  'POST /api/ingest/heartbeat': 'heartbeat:write',
  'POST /api/ingest/event': 'events:write',
  'POST /api/ingest/cost': 'costs:write',
  'POST /api/interrupt': 'interrupt-create',
  'GET /api/interrupt': 'interrupt-claim',
  'PATCH /api/interrupt': 'interrupt-claim',
};

// Source text each handler body must contain for its access class.
export const REQUIRED_GUARDS: Record<Access, string[]> = {
  public: [],
  invite: ['verifyInvite('],
  'enrollment-open': ['agentEnrollmentEnabled()'],
  operator: ['authorizeOperator('],
  'telemetry-read': ['authorizeTelemetryRead('],
  'heartbeat:write': ["authorizeAgent(request, 'heartbeat:write')", 'hasIdentityScope('],
  'events:write': ["authorizeAgent(request, 'events:write')", 'hasIdentityScope('],
  'costs:write': ["authorizeAgent(request, 'costs:write')", 'hasIdentityScope('],
  'interrupt-create': ['authorizeOperator(', 'interruptsEnabled()'],
  'interrupt-claim': ["authorizeAgent(request, 'interrupts:claim')", 'interruptsEnabled()'],
};
