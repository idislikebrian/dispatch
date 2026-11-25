import { randomUUID, createHash, createHmac } from 'node:crypto';

const base = process.env.DISPATCH_BASE_URL ?? 'https://dispatch-taupe.vercel.app';
const keyId = process.env.DISPATCH_IDENTITY_KEY_ID;
const secret = process.env.DISPATCH_IDENTITY_SECRET;
if (!keyId || !secret) throw new Error('protected Dispatch identity runtime is unavailable');

function sign(method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const digest = createHash('sha256').update(body).digest('hex');
  const canonical = [method, path, timestamp, nonce, digest].join('\n');
  return `v1=${createHmac('sha256', secret!).update(canonical).digest('hex')}`;
}

async function send(path: string, payload: unknown, idempotencyKey: string): Promise<void> {
  const body = JSON.stringify(payload); const timestamp = String(Date.now()); const nonce = randomUUID();
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dispatch-key-id': keyId!, 'x-dispatch-timestamp': timestamp, 'x-dispatch-nonce': nonce, 'x-dispatch-signature': sign('POST', path, timestamp, nonce, body), 'idempotency-key': idempotencyKey }, body });
  if (!response.ok) throw new Error(`Dispatch ${path} returned ${response.status}`);
}

async function tick(): Promise<void> {
  await send('/api/ingest/heartbeat', { agentName: 'June', agentType: 'openclaw', status: 'online', metadata: { source: 'continuous-reporter' } }, `june-heartbeat-${Date.now()}`);
}

async function main(): Promise<void> {
  await send('/api/ingest/event', { agentName: 'June', agentType: 'openclaw', type: 'info', message: 'continuous Dispatch reporter started', project: 'Cobalt', metadata: { source: 'continuous-reporter' } }, `june-reporter-start-${Date.now()}`);
  await tick();
  setInterval(() => { void tick().catch((error) => console.error(error instanceof Error ? error.message : String(error))); }, 30_000);
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
