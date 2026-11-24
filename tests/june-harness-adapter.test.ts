import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExecutionEvidence, hashSyntheticArtifact } from '../integrations/june-harness-adapter';

test('links command, harness session, tool execution, and artifact', () => {
  const command = { id: 'cmd-1', type: 'custom', message: 'synthetic', claimToken: 'claim-1' } as const;
  const artifactSha256 = hashSyntheticArtifact('synthetic artifact');
  const evidence = buildExecutionEvidence(command, 'completed', {
    sessionId: 'session-1',
    toolExecutionId: 'tool-1',
    artifactPath: '.runtime/synthetic-artifact.txt',
    artifactSha256,
    telemetry: { source: 'measured', inputTokens: 10, outputTokens: 4, costUsd: 0.001 },
  });
  assert.deepEqual(evidence, {
    commandId: 'cmd-1', harness: 'openclaw', sessionId: 'session-1', toolExecutionId: 'tool-1', state: 'completed',
    artifactPath: '.runtime/synthetic-artifact.txt', artifactSha256,
    telemetry: { source: 'measured', inputTokens: 10, outputTokens: 4, costUsd: 0.001 },
  });
});

test('failure evidence is distinct from acknowledgment', () => {
  const evidence = buildExecutionEvidence({ id: 'cmd-2', type: 'stop', message: 'synthetic failure', claimToken: 'claim-2' }, 'failed', { error: 'synthetic tool failure' });
  assert.equal(evidence.state, 'failed');
  assert.equal(evidence.error, 'synthetic tool failure');
});

