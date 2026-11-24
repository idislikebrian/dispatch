import assert from 'node:assert/strict';
import { evaluateIdempotency, isFreshTimestamp, leaseWindow, retryDelayMs, signRequest, timingSafeSignatureEqual } from '@/lib/security';

const secret = 'synthetic-development-secret';
const now = Date.now();
const timestamp = String(now);
const signature = signRequest(secret, 'POST', '/api/ingest/event', timestamp, 'nonce-1', '{"synthetic":true}');

assert.equal(signature.startsWith('v1='), true);
assert.equal(timingSafeSignatureEqual(signature, signRequest(secret, 'POST', '/api/ingest/event', timestamp, 'nonce-1', '{"synthetic":true}')), true);
assert.equal(timingSafeSignatureEqual(signature, signRequest(secret, 'POST', '/api/ingest/event', timestamp, 'nonce-1', '{"synthetic":false}')), false);
assert.equal(isFreshTimestamp(timestamp, now), true);
assert.equal(isFreshTimestamp(String(now - 5 * 60 * 1000 - 1), now), false);

const lease = leaseWindow({ now: new Date(now), leaseMs: 1000, attempt: 2 });
assert.equal(lease.attempts, 3);
assert.equal(lease.leaseExpiresAt.getTime(), now + 1000);
assert.equal(retryDelayMs(1), 1000);
assert.equal(retryDelayMs(4), 8000);
assert.deepEqual(evaluateIdempotency(null, 'body'), { replay: false, requestHash: evaluateIdempotency(null, 'body').requestHash });
assert.equal(evaluateIdempotency(evaluateIdempotency(null, 'body').requestHash, 'body').replay, true);
assert.throws(() => evaluateIdempotency('wrong-hash', 'body'), /different request/);

console.log('security lifecycle tests passed');
