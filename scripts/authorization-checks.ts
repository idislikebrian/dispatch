// End-to-end authorization checks over HTTP: anonymous, ordinary account,
// operator, and agent credentials against every route. Creates synthetic
// fixtures, so it only runs against a disposable database.
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { assertDisposableDatabase } from '../lib/db/destructive-guard';
import { createInvite } from '../lib/security/invite';
import { signRequest } from '../lib/security/signing';

export const OPERATOR_ID = 'qa-authz-operator';
export const REMOVABLE_OPERATOR_ID = 'qa-authz-operator-removable';

export interface CheckOptions {
  base: string;
  databaseUrl: string;
  interrupts: boolean;
  agentEnrollment: boolean;
  enrollmentSecret: string | null;
  linearConfigured: boolean;
  // Deleting a fixture user is only done against a throwaway local database.
  allowFixtureDelete: boolean;
  headers?: Record<string, string>;
}

type Agent = { id: string; agentId: string; name: string; keyId: string; secret: string };
type Actor = { cookie?: string; agent?: Agent; forge?: boolean };
type Call = { body?: unknown; nonce?: string };

export async function runAuthorizationChecks(options: CheckOptions): Promise<{ passed: number; failed: string[] }> {
  assertDisposableDatabase([options.databaseUrl], process.env, 'authorization checks');
  const prisma = new PrismaClient({ datasourceUrl: options.databaseUrl });
  const run = randomBytes(4).toString('hex');
  const failed: string[] = [];
  let passed = 0;
  const check = (name: string, ok: boolean, detail = '') => { if (ok) passed += 1; else failed.push(`${name}${detail ? ` (${detail})` : ''}`); };

  async function call(actor: Actor, method: string, path: string, { body, nonce = randomUUID() }: Call = {}) {
    const headers: Record<string, string> = { ...options.headers, 'content-type': 'application/json' };
    const text = method === 'GET' ? undefined : JSON.stringify(body ?? {});
    if (actor.cookie) headers.cookie = actor.cookie;
    if (actor.agent) {
      const timestamp = String(Date.now());
      const secret = actor.forge ? 'forged-secret' : actor.agent.secret;
      Object.assign(headers, {
        'x-dispatch-key-id': actor.agent.keyId, 'x-dispatch-timestamp': timestamp, 'x-dispatch-nonce': nonce,
        'x-dispatch-signature': signRequest(secret, method, path.split('?')[0], timestamp, nonce, text ?? ''),
        ...(method === 'GET' ? {} : { 'idempotency-key': `idem-${nonce}` }),
      });
    }
    const response = await fetch(`${options.base}${path}`, { method, headers, body: text, redirect: 'manual' });
    const raw = await response.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* HTML or empty */ }
    return { status: response.status, data, location: response.headers.get('location'), cookie: response.headers.get('set-cookie')?.split(';', 1)[0] };
  }
  async function expect(label: string, status: number | number[], actor: Actor, method: string, path: string, init?: Call) {
    const result = await call(actor, method, path, init);
    const allowed = Array.isArray(status) ? status : [status];
    check(`${label}: ${method} ${path.replace(run, '*').split('?')[0]} -> ${allowed.join('|')}`, allowed.includes(result.status), `got ${result.status}`);
    return result;
  }
  async function account(id: string): Promise<Actor> {
    const email = `${id}@synthetic.invalid`;
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({ where: { id }, update: { passwordHash }, create: { id, email, passwordHash } });
    const result = await expect('fixture login', 200, {}, 'POST', '/api/auth/login', { body: { email, password } });
    // The target must be reading the database the fixtures were written to.
    if (result.status !== 200 || !result.cookie) throw new Error('fixture login failed: check that the target uses this database; stopping');
    return { cookie: result.cookie };
  }

  try {
    const anon: Actor = {};
    const user = await account('qa-authz-ordinary');
    const operator = await account(OPERATOR_ID);
    const badCookie: Actor = { cookie: 'dispatch-session=not-a-valid-session' };

    async function provision(label: string, permissions: string[]): Promise<Actor & { agent: Agent }> {
      const name = `qa-authz-${label}-${run}`;
      const created = await expect('operator provisions agent', 201, operator, 'POST', '/api/auth/identities', { body: { name, permissions, project: 'Experimental' } });
      const identity = await prisma.authenticatedIdentity.findUniqueOrThrow({ where: { id: created.data.id } });
      return { agent: { id: identity.id, agentId: identity.agentId!, name, keyId: created.data.keyId, secret: created.data.secret } };
    }
    const full = await provision('full', ['heartbeat:write', 'events:write', 'costs:write', 'telemetry:read', 'interrupts:claim']);
    const other = await provision('other', ['heartbeat:write', 'events:write', 'costs:write', 'telemetry:read', 'interrupts:claim']);
    // Mirrors the permissions of the production reporting agent.
    const reporter = await provision('reporter', ['heartbeat:write', 'events:write', 'telemetry:read']);
    const writeOnly = await provision('writeonly', ['heartbeat:write']);
    const forged: Actor = { agent: full.agent, forge: true };
    await expect('operator cannot duplicate a credential', 409, operator, 'POST', '/api/auth/identities', { body: { name: full.agent.name } });

    // Ingestion: bound agent credentials only, own records only.
    const bodies = (agentName: string) => ({
      heartbeat: { agentName, status: 'online', metadata: { synthetic: true } },
      event: { agentName, type: 'error', message: 'synthetic authorization check', project: 'Experimental', metadata: { synthetic: true } },
      cost: { agentName, model: 'synthetic', inputTokens: 1, outputTokens: 1, costUsd: 0.01 },
    });
    const events: Record<string, string> = {};
    for (const actor of [full, other]) {
      const own = bodies(actor.agent.name);
      await expect('agent own', 200, actor, 'POST', '/api/ingest/heartbeat', { body: own.heartbeat });
      events[actor.agent.name] = (await expect('agent own', 200, actor, 'POST', '/api/ingest/event', { body: own.event })).data?.id;
      await expect('agent own', 200, actor, 'POST', '/api/ingest/cost', { body: own.cost });
    }
    for (const kind of ['heartbeat', 'event', 'cost'] as const) {
      const path = `/api/ingest/${kind}`;
      const body = bodies(full.agent.name)[kind];
      await expect('anonymous', 401, anon, 'POST', path, { body });
      await expect('forged cookie', 401, badCookie, 'POST', path, { body });
      await expect('forged signature', 401, forged, 'POST', path, { body });
      await expect('ordinary account', 403, user, 'POST', path, { body });
      await expect('operator', 403, operator, 'POST', path, { body });
      await expect('agent as another agent', 403, full, 'POST', path, { body: bodies(other.agent.name)[kind] });
      await expect('agent as unknown agent', 403, full, 'POST', path, { body: bodies(`qa-authz-unknown-${run}`)[kind] });
      await expect('agent outside project', kind === 'heartbeat' ? 200 : 403, full, 'POST', path, { body: { ...body, project: 'Cobalt' } });
    }
    await expect('reporter without cost permission', 403, reporter, 'POST', '/api/ingest/cost', { body: bodies(reporter.agent.name).cost });
    await expect('write-only without event permission', 403, writeOnly, 'POST', '/api/ingest/event', { body: bodies(writeOnly.agent.name).event });
    await expect('reporter heartbeat', 200, reporter, 'POST', '/api/ingest/heartbeat', { body: bodies(reporter.agent.name).heartbeat });
    await expect('reporter event', 200, reporter, 'POST', '/api/ingest/event', { body: bodies(reporter.agent.name).event });
    await expect('cost on another agent event', 403, full, 'POST', '/api/ingest/cost', { body: { ...bodies(full.agent.name).cost, eventId: events[other.agent.name] } });
    const nonce = randomUUID();
    await expect('first use of nonce', 200, full, 'POST', '/api/ingest/heartbeat', { body: bodies(full.agent.name).heartbeat, nonce });
    await expect('replayed nonce', 401, full, 'POST', '/api/ingest/heartbeat', { body: bodies(full.agent.name).heartbeat, nonce });
    check('no spoofed agent was created', (await prisma.agent.count({ where: { name: `qa-authz-unknown-${run}` } })) === 0);

    // Telemetry reads: operator sees all, agent sees itself.
    const names = (data: any): string[] => (Array.isArray(data) ? data : data?.events ?? []).map((item: any) => item.agentName ?? item.agent?.name ?? item.name);
    for (const path of ['/api/agents', '/api/activity', '/api/cost/summary', '/api/errors']) {
      await expect('anonymous', 401, anon, 'GET', path);
      await expect('forged cookie', 401, badCookie, 'GET', path);
      await expect('forged signature', 401, forged, 'GET', path);
      await expect('ordinary account', 403, user, 'GET', path);
      await expect('agent without read', 403, writeOnly, 'GET', path);
      const all = names((await expect('operator', 200, operator, 'GET', path)).data);
      check(`operator sees both agents: ${path}`, all.includes(full.agent.name) && all.includes(other.agent.name));
      const own = names((await expect('agent', 200, full, 'GET', path)).data);
      check(`agent sees only itself: ${path}`, own.length > 0 && own.every((name) => name === full.agent.name), `${new Set(own).size} agents`);
    }
    await expect('agent asks for another', 403, full, 'GET', `/api/activity?agentId=${other.agent.agentId}`);
    const readback = `/api/telemetry/readback?agentId=${full.agent.agentId}`;
    await expect('anonymous', 401, anon, 'GET', readback);
    await expect('ordinary account', 403, user, 'GET', readback);
    await expect('operator', 200, operator, 'GET', readback);
    await expect('agent own', 200, full, 'GET', readback);
    await expect('agent other', 403, full, 'GET', `/api/telemetry/readback?agentId=${other.agent.agentId}`);
    await expect('agent without read', 403, writeOnly, 'GET', '/api/telemetry/readback');

    // Operator-only administration and data.
    const target = other.agent.id;
    const denied: Array<[string, string, unknown?]> = [
      ['GET', '/api/auth/identities'], ['POST', '/api/auth/identities', { name: `qa-authz-denied-${run}` }],
      ['PATCH', `/api/auth/identities/${target}`, { action: 'rotate' }], ['PATCH', `/api/auth/identities/${target}`, { action: 'revoke' }],
      ['PATCH', `/api/auth/identities/${target}`, { action: 'set-permissions', permissions: [] }],
      ['GET', '/api/enrollment/requests'], ['POST', '/api/enrollment/requests/any-id', { action: 'approve' }],
      ['GET', '/api/content'], ['GET', '/api/content/summary'],
      ['POST', '/api/content', { title: `denied-${run}`, project: 'Experimental', platform: 'substack', stage: 'idea', ownerName: 'qa', ownerType: 'human' }],
      ['PATCH', '/api/content/any-id', { title: 'denied' }],
      ['GET', '/api/integrations/linear/issues'], ['POST', '/api/integrations/linear/sync'],
    ];
    const before = await prisma.authenticatedIdentity.findUniqueOrThrow({ where: { id: target } });
    for (const [method, path, body] of denied) {
      await expect('anonymous', 401, anon, method, path, { body });
      await expect('forged cookie', 401, badCookie, method, path, { body });
      await expect('forged signature', 401, forged, method, path, { body });
      await expect('ordinary account', 403, user, method, path, { body });
      await expect('agent credential', 403, full, method, path, { body });
      await expect('agent credential plus operator cookie', 403, { ...full, cookie: operator.cookie }, method, path, { body });
    }
    const after = await prisma.authenticatedIdentity.findUniqueOrThrow({ where: { id: target } });
    check('denied requests changed no identity', before.updatedAt.getTime() === after.updatedAt.getTime() || (before.keyId === after.keyId && after.active && JSON.stringify(before.permissions) === JSON.stringify(after.permissions)));
    check('denied requests created nothing', (await prisma.contentItem.count({ where: { title: `denied-${run}` } })) === 0 && (await prisma.agent.count({ where: { name: `qa-authz-denied-${run}` } })) === 0);

    await expect('operator', 200, operator, 'GET', '/api/auth/identities');
    await expect('operator', 200, operator, 'PATCH', `/api/auth/identities/${writeOnly.agent.id}`, { body: { action: 'set-permissions', permissions: ['heartbeat:write', 'operator'] } });
    check('unknown permission is discarded', JSON.stringify((await prisma.authenticatedIdentity.findUniqueOrThrow({ where: { id: writeOnly.agent.id } })).permissions) === '["heartbeat:write"]');
    const item = await expect('operator', 201, operator, 'POST', '/api/content', { body: { title: `qa-authz-${run}`, project: 'Experimental', platform: 'substack', stage: 'idea', ownerName: 'qa', ownerType: 'human' } });
    await expect('operator', 200, operator, 'PATCH', `/api/content/${item.data?.id}`, { body: { stage: 'archived' } });
    await expect('operator', 200, operator, 'GET', '/api/content');
    await expect('operator', 200, operator, 'GET', '/api/content/summary');
    await expect('operator', 200, operator, 'GET', '/api/integrations/linear/issues');
    // Authorized but unconfigured is a 502; a configured target is not synced here.
    if (!options.linearConfigured) await expect('operator (Linear unconfigured)', 502, operator, 'POST', '/api/integrations/linear/sync');

    // Interrupts.
    const command = { agentName: full.agent.name, type: 'summarize', message: 'synthetic' };
    const claim = `/api/interrupt?agentId=${full.agent.agentId}`;
    await expect('anonymous', 401, anon, 'POST', '/api/interrupt', { body: command });
    await expect('ordinary account', 403, user, 'POST', '/api/interrupt', { body: command });
    await expect('agent cannot create', 403, full, 'POST', '/api/interrupt', { body: command });
    await expect('anonymous', 401, anon, 'GET', claim);
    await expect('ordinary account', 403, user, 'GET', claim);
    await expect('operator cannot claim', 403, operator, 'GET', claim);
    await expect('agent without claim permission', 403, reporter, 'GET', `/api/interrupt?agentId=${reporter.agent.agentId}`);
    await expect('anonymous', 401, anon, 'PATCH', '/api/interrupt', { body: { id: 'x', claimToken: 'x', action: 'ack' } });
    await expect('ordinary account', 403, user, 'PATCH', '/api/interrupt', { body: { id: 'x', claimToken: 'x', action: 'ack' } });
    await expect('operator cannot acknowledge', 403, operator, 'PATCH', '/api/interrupt', { body: { id: 'x', claimToken: 'x', action: 'ack' } });
    if (!options.interrupts) {
      await expect('operator, interrupts disabled', 403, operator, 'POST', '/api/interrupt', { body: command });
      await expect('agent, interrupts disabled', 403, full, 'GET', claim);
      await expect('agent, interrupts disabled', 403, full, 'PATCH', '/api/interrupt', { body: { id: 'x', claimToken: 'x', action: 'ack' } });
      check('no interrupt was stored', (await prisma.agentInterrupt.count({ where: { agentId: full.agent.agentId } })) === 0);
    } else {
      await expect('operator, interrupts enabled', 201, operator, 'POST', '/api/interrupt', { body: command });
      await expect('agent claims for another', 403, other, 'GET', claim);
      const claimed = (await expect('target agent', 200, full, 'GET', claim)).data?.interrupts?.[0];
      check('target agent received its command', Boolean(claimed?.claimToken));
      const ack = { id: claimed?.id, claimToken: claimed?.claimToken, action: 'ack' };
      await expect('another agent with a stolen claim token', 409, other, 'PATCH', '/api/interrupt', { body: ack });
      await expect('target agent', 200, full, 'PATCH', '/api/interrupt', { body: ack });
    }

    // Agent enrollment.
    const request = { agentName: `qa-authz-enrolled-${run}`, harness: 'synthetic', project: 'Experimental', permissions: ['heartbeat:write', 'telemetry:read', 'interrupts:claim'] };
    if (!options.agentEnrollment) {
      await expect('anonymous, enrollment off', 403, anon, 'POST', '/api/enrollment/requests', { body: request });
      await expect('anonymous, enrollment off', 403, anon, 'POST', '/api/enrollment/exchange', { body: { requestId: 'x', exchangeToken: 'x' } });
    } else {
      await prisma.enrollmentRequest.updateMany({ where: { status: 'pending', agentName: { startsWith: 'qa-authz-' } }, data: { status: 'expired', dedupeKey: null } });
      const opened = await expect('anonymous, enrollment on', 201, anon, 'POST', '/api/enrollment/requests', { body: request });
      const exchange = { requestId: opened.data?.requestId, exchangeToken: opened.data?.exchangeToken };
      await expect('exchange before approval', 409, anon, 'POST', '/api/enrollment/exchange', { body: exchange });
      await expect('ordinary account cannot approve', 403, user, 'POST', `/api/enrollment/requests/${exchange.requestId}`, { body: { action: 'approve' } });
      await expect('operator approves', 200, operator, 'POST', `/api/enrollment/requests/${exchange.requestId}`, { body: { action: 'approve' } });
      await expect('wrong exchange token', 401, anon, 'POST', '/api/enrollment/exchange', { body: { ...exchange, exchangeToken: 'wrong' } });
      const granted = await expect('exchange', 200, anon, 'POST', '/api/enrollment/exchange', { body: exchange });
      check('enrolled agent receives write permissions only', JSON.stringify(granted.data?.permissions) === '["heartbeat:write"]');
      await expect('exchange reuse', 409, anon, 'POST', '/api/enrollment/exchange', { body: exchange });
      const identity = await prisma.authenticatedIdentity.findUniqueOrThrow({ where: { keyId: granted.data.keyId } });
      const enrolled: Actor = { agent: { id: identity.id, agentId: identity.agentId!, name: request.agentName, keyId: granted.data.keyId, secret: granted.data.secret } };
      await expect('enrolled agent', 200, enrolled, 'POST', '/api/ingest/heartbeat', { body: bodies(request.agentName).heartbeat });
      await expect('enrolled agent has no read access', 403, enrolled, 'GET', '/api/agents');
      await expect('enrolled agent has no admin access', 403, enrolled, 'GET', '/api/auth/identities');
      const hijack = await expect('request naming an existing agent', 201, anon, 'POST', '/api/enrollment/requests', { body: { ...request, agentName: full.agent.name } });
      await expect('approval never reissues a credential', 409, operator, 'POST', `/api/enrollment/requests/${hijack.data?.requestId}`, { body: { action: 'approve' } });
      await expect('requester gets nothing', 409, anon, 'POST', '/api/enrollment/exchange', { body: { requestId: hijack.data?.requestId, exchangeToken: hijack.data?.exchangeToken } });
      await expect('operator rejects', 200, operator, 'POST', `/api/enrollment/requests/${hijack.data?.requestId}`, { body: { action: 'reject' } });
      await expect('operator revokes enrolled agent', 200, operator, 'PATCH', `/api/auth/identities/${identity.id}`, { body: { action: 'revoke' } });
      await expect('revoked agent', 401, enrolled, 'POST', '/api/ingest/heartbeat', { body: bodies(request.agentName).heartbeat });
    }

    // Account enrollment.
    await expect('open registration removed', [404, 405], anon, 'POST', '/api/auth/register', { body: { email: `qa-authz-${run}@synthetic.invalid`, password: 'synthetic-only-password' } });
    const email = `qa-authz-invitee-${run}@synthetic.invalid`;
    const password = randomBytes(24).toString('base64url');
    if (!options.enrollmentSecret) {
      await expect('enrollment disabled', 403, anon, 'POST', '/api/auth/enroll', { body: { email, password, token: 'x' } });
    } else {
      const token = createInvite(options.enrollmentSecret, email, Date.now() + 60_000);
      await expect('no invitation', 400, anon, 'POST', '/api/auth/enroll', { body: { email, password } });
      await expect('wrong secret', 403, anon, 'POST', '/api/auth/enroll', { body: { email, password, token: createInvite('x'.repeat(40), email, Date.now() + 60_000) } });
      await expect('invitation for another email', 403, anon, 'POST', '/api/auth/enroll', { body: { email: `x-${email}`, password, token } });
      await expect('expired invitation', 403, anon, 'POST', '/api/auth/enroll', { body: { email, password, token: createInvite(options.enrollmentSecret, email, Date.now() - 1) } });
      await expect('short password', 400, anon, 'POST', '/api/auth/enroll', { body: { email, password: 'short', token } });
      const joined = await expect('valid invitation', 201, anon, 'POST', '/api/auth/enroll', { body: { email, password, token } });
      await expect('invitation reuse', 409, anon, 'POST', '/api/auth/enroll', { body: { email, password, token } });
      await expect('invited account is not an operator', 403, { cookie: joined.cookie }, 'GET', '/api/agents');
    }
    check('open registration created no account', (await prisma.user.count({ where: { email: `qa-authz-${run}@synthetic.invalid` } })) === 0);
    await expect('wrong password', 401, anon, 'POST', '/api/auth/login', { body: { email: `${OPERATOR_ID}@synthetic.invalid`, password: 'wrong' } });

    // Dashboard.
    for (const page of ['/dashboard', '/dashboard/agents', '/dashboard/office', '/dashboard/content', '/dashboard/tasks']) {
      const out = await expect('anonymous', [303, 307], anon, 'GET', page);
      check(`anonymous is sent to login: ${page}`, out.location === '/');
      const plain = await expect('ordinary account', [303, 307], user, 'GET', page);
      check(`ordinary account is refused: ${page}`, plain.location === '/?access=denied');
      await expect('operator', 200, operator, 'GET', page);
    }
    const out = await expect('logout', 200, operator, 'POST', '/api/auth/logout');
    check('logout clears the cookie', /^dispatch-session=$/.test(out.cookie ?? ''));

    if (options.allowFixtureDelete) {
      const removable = await account(REMOVABLE_OPERATOR_ID);
      await expect('allowlisted operator', 200, removable, 'GET', '/api/agents');
      await prisma.user.delete({ where: { id: REMOVABLE_OPERATOR_ID } });
      await expect('deleted operator with a live session', 403, removable, 'GET', '/api/agents');
    }

    // Leave no usable synthetic credential behind.
    const fresh = await account(OPERATOR_ID);
    for (const actor of [full, other, reporter, writeOnly]) await expect('cleanup revoke', 200, fresh, 'PATCH', `/api/auth/identities/${actor.agent.id}`, { body: { action: 'revoke' } });
    await expect('revoked agent', 401, full, 'GET', '/api/agents');
  } finally {
    await prisma.$disconnect();
  }
  return { passed, failed };
}
