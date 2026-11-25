import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveAgentStatus } from '../lib/agents/status';

test('stale online heartbeat is offline', () => {
  const now = Date.now();
  assert.equal(deriveAgentStatus('online', new Date(now - 61_000), now), 'offline');
  assert.equal(deriveAgentStatus('online', new Date(now - 59_000), now), 'online');
  assert.equal(deriveAgentStatus('online', null, now), 'offline');
});
