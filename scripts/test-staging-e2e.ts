import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { signRequest } from '@/lib/security/signing';
import { buildExecutionEvidence, hashSyntheticArtifact } from '@/integrations/june-harness-adapter';

const base = process.env.BASE_URL ?? 'http://localhost:3100';
const email = `june-staging-${Date.now()}@synthetic.invalid`;
const password = 'synthetic-only-password';
let cookie = '';

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set('cookie', cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';', 1)[0];
  return response;
}

async function json(response: Response): Promise<any> {
  const value = await response.json();
  assert.ok(response.ok, `${response.status}: ${JSON.stringify(value)}`);
  return value;
}

async function signed(path: string, method: string, body: unknown, keyId: string, secret: string, nonce: string = randomUUID(), idempotencyKey?: string): Promise<Response> {
  const text = method === 'GET' ? '' : JSON.stringify(body);
  const timestamp = String(Date.now());
  return request(path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-dispatch-key-id': keyId,
      'x-dispatch-timestamp': timestamp,
      'x-dispatch-nonce': nonce,
      'x-dispatch-signature': signRequest(secret, method, path.split('?')[0], timestamp, nonce, text),
      ...(method === 'GET' ? {} : { 'idempotency-key': idempotencyKey ?? `idem-${nonce}` }),
    },
    body: text || undefined,
  });
}

async function main(): Promise<void> {
const unauthenticated = await fetch(`${base}/api/agents`);
assert.equal(unauthenticated.status, 401, 'public agent reads must require authentication');

await json(await request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }));
const dashboard = await request('/dashboard');
assert.equal(dashboard.status, 200, 'authenticated session must reach the dashboard landing page');
const identity = await json(await request('/api/auth/identities', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'june-staging' }) }));

const heartbeat = await signed('/api/ingest/heartbeat', 'POST', { agentName: 'june-staging', agentType: 'openclaw', status: 'online', metadata: { synthetic: true } }, identity.keyId, identity.secret);
assert.equal(heartbeat.status, 200);
const eventBody = { agentName: 'june-staging', agentType: 'openclaw', type: 'info', message: 'synthetic staging event', project: 'Experimental', metadata: { synthetic: true } };
const event = await signed('/api/ingest/event', 'POST', eventBody, identity.keyId, identity.secret, 'event-nonce-1');
assert.equal(event.status, 200);
const replay = await signed('/api/ingest/event', 'POST', eventBody, identity.keyId, identity.secret, 'event-nonce-1');
assert.equal(replay.status, 401, 'nonce replay must be rejected');
const idemEvent = await signed('/api/ingest/event', 'POST', { ...eventBody, message: 'synthetic idempotent event' }, identity.keyId, identity.secret, 'event-nonce-2', 'idem-event-1');
assert.equal(idemEvent.status, 200);
const idemReplay = await signed('/api/ingest/event', 'POST', { ...eventBody, message: 'synthetic idempotent event' }, identity.keyId, identity.secret, 'event-nonce-3', 'idem-event-1');
assert.equal(idemReplay.status, 401, 'idempotency key replay must be rejected');

const agents = await json(await signed('/api/agents', 'GET', {}, identity.keyId, identity.secret));
const agent = agents.find((value: any) => value.name === 'june-staging');
assert.ok(agent, 'agent should be visible through authenticated read');

const command = await json(await signed('/api/interrupt', 'POST', { agentName: 'june-staging', type: 'summarize', message: 'synthetic command' }, identity.keyId, identity.secret));
const firstClaim = await json(await signed(`/api/interrupt?agentId=${agent.id}&leaseMs=5000`, 'GET', {}, identity.keyId, identity.secret));
assert.equal(firstClaim.interrupts.length, 1, 'command should be claimed exactly once');
const secondClaim = await json(await signed(`/api/interrupt?agentId=${agent.id}&leaseMs=5000`, 'GET', {}, identity.keyId, identity.secret));
assert.equal(secondClaim.interrupts.length, 0, 'active lease must prevent duplicate delivery');
const claimed = firstClaim.interrupts[0];
const executionCommand = { id: claimed.id, type: claimed.type, message: claimed.message, claimToken: claimed.claimToken };
const sessionId = `june-staging-session-${Date.now()}`;
const toolExecutionId = `synthetic-tool-${Date.now()}`;
const artifactPath = `.runtime/staging-${claimed.id}.txt`;
await mkdir('.runtime', { recursive: true });
const artifactContent = `synthetic output for Dispatch command ${claimed.id}`;
await writeFile(artifactPath, artifactContent, 'utf8');
const startedEvidence = buildExecutionEvidence(executionCommand, 'started', { sessionId, toolExecutionId });
assert.equal((await signed('/api/ingest/event', 'POST', { agentName: 'june-staging', type: 'action', message: 'synthetic command execution started', project: 'Experimental', metadata: startedEvidence }, identity.keyId, identity.secret)).status, 200);
const completedEvidence = buildExecutionEvidence(executionCommand, 'completed', { sessionId, toolExecutionId, artifactPath, artifactSha256: hashSyntheticArtifact(artifactContent), telemetry: { source: 'measured', inputTokens: 12, outputTokens: 8, costUsd: 0.001 } });
assert.equal((await signed('/api/ingest/event', 'POST', { agentName: 'june-staging', type: 'action', message: 'synthetic command execution completed', project: 'Experimental', metadata: completedEvidence }, identity.keyId, identity.secret)).status, 200);
assert.equal((await signed('/api/interrupt', 'PATCH', { id: claimed.id, claimToken: claimed.claimToken, action: 'ack' }, identity.keyId, identity.secret)).status, 200);
const afterAck = await json(await signed(`/api/interrupt?agentId=${agent.id}`, 'GET', {}, identity.keyId, identity.secret));
assert.equal(afterAck.interrupts.length, 0, 'acknowledged command must not redeliver');

const retryCommand = await json(await signed('/api/interrupt', 'POST', { agentName: 'june-staging', type: 'pause', message: 'synthetic retry' }, identity.keyId, identity.secret));
const retryClaim = await json(await signed(`/api/interrupt?agentId=${agent.id}&leaseMs=5000`, 'GET', {}, identity.keyId, identity.secret));
const retryItem = retryClaim.interrupts.find((item: any) => item.id === retryCommand.id);
assert.ok(retryItem, 'retry command should be claimed');
const failedEvidence = buildExecutionEvidence({ id: retryItem.id, type: retryItem.type, message: retryItem.message, claimToken: retryItem.claimToken }, 'failed', { error: 'synthetic tool failure', telemetry: { source: 'unavailable', inputTokens: null, outputTokens: null, costUsd: null } });
assert.equal((await signed('/api/ingest/event', 'POST', { agentName: 'june-staging', type: 'error', message: 'synthetic command execution failed', project: 'Experimental', metadata: failedEvidence }, identity.keyId, identity.secret)).status, 200);
assert.equal((await signed('/api/interrupt', 'PATCH', { id: retryItem.id, claimToken: retryItem.claimToken, action: 'retry' }, identity.keyId, identity.secret)).status, 200);
assert.equal((await json(await signed(`/api/interrupt?agentId=${agent.id}`, 'GET', {}, identity.keyId, identity.secret))).interrupts.length, 0, 'retry backoff should prevent immediate redelivery');
await new Promise((resolve) => setTimeout(resolve, 1_100));
const retryAgain = await json(await signed(`/api/interrupt?agentId=${agent.id}&leaseMs=5000`, 'GET', {}, identity.keyId, identity.secret));
const retriedItem = retryAgain.interrupts.find((item: any) => item.id === retryCommand.id);
assert.ok(retriedItem, 'retry command should become claimable after backoff');
assert.equal((await signed('/api/interrupt', 'PATCH', { id: retriedItem.id, claimToken: retriedItem.claimToken, action: 'ack' }, identity.keyId, identity.secret)).status, 200);

const expiringCommand = await json(await signed('/api/interrupt', 'POST', { agentName: 'june-staging', type: 'stop', message: 'synthetic expiration', expiresAt: new Date(Date.now() + 50).toISOString() }, identity.keyId, identity.secret));
await new Promise((resolve) => setTimeout(resolve, 100));
const afterExpiration = await json(await signed(`/api/interrupt?agentId=${agent.id}`, 'GET', {}, identity.keyId, identity.secret));
assert.equal(afterExpiration.interrupts.some((item: any) => item.id === expiringCommand.id), false, 'expired command must not be delivered');
assert.equal(hashSyntheticArtifact(await readFile(artifactPath, 'utf8')), completedEvidence.artifactSha256, 'artifact hash must match completion evidence');
const activity = await json(await signed(`/api/activity?agentId=${agent.id}`, 'GET', {}, identity.keyId, identity.secret));
assert.ok(activity.some((item: any) => item.message === 'synthetic command execution completed' && item.metadata?.commandId === claimed.id), 'completion evidence must be readable');
assert.ok(activity.some((item: any) => item.message === 'synthetic command execution failed' && item.metadata?.commandId === retryCommand.id), 'failure evidence must be readable');

console.log(JSON.stringify({ ok: true, agent: agent.name, eventId: (await event.json()).id, commandId: command.id }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

