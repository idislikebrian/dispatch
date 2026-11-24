import { createHash, randomUUID } from 'node:crypto';

export type ExecutionState = 'started' | 'completed' | 'failed';
export type TelemetrySource = 'measured' | 'provider-reported' | 'estimated' | 'unavailable';

export interface ClaimedCommand {
  id: string;
  type: string;
  message: string | null;
  claimToken: string;
}

export interface ExecutionEvidence {
  commandId: string;
  harness: 'openclaw';
  sessionId: string;
  toolExecutionId: string;
  state: ExecutionState;
  artifactPath?: string;
  artifactSha256?: string;
  error?: string;
  telemetry: { source: TelemetrySource; inputTokens: number | null; outputTokens: number | null; costUsd: number | null };
}

export function buildExecutionEvidence(command: ClaimedCommand, state: ExecutionState, options: Partial<Omit<ExecutionEvidence, 'commandId' | 'harness' | 'sessionId' | 'toolExecutionId' | 'state'>> = {}): ExecutionEvidence {
  return {
    commandId: command.id,
    harness: 'openclaw',
    sessionId: options.sessionId ?? `june-session-${randomUUID()}`,
    toolExecutionId: options.toolExecutionId ?? `synthetic-tool-${randomUUID()}`,
    state,
    artifactPath: options.artifactPath,
    artifactSha256: options.artifactSha256,
    error: options.error,
    telemetry: options.telemetry ?? { source: 'unavailable', inputTokens: null, outputTokens: null, costUsd: null },
  };
}

export function hashSyntheticArtifact(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

