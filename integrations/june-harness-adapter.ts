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

type ExecutionEvidenceOptions = Partial<Pick<ExecutionEvidence, 'sessionId' | 'toolExecutionId' | 'artifactPath' | 'artifactSha256' | 'error' | 'telemetry'>>;

export function buildExecutionEvidence(command: ClaimedCommand, state: ExecutionState, options: ExecutionEvidenceOptions = {}): ExecutionEvidence {
  return {
    commandId: command.id,
    harness: 'openclaw',
    sessionId: options.sessionId ?? `june-session-${randomUUID()}`,
    toolExecutionId: options.toolExecutionId ?? `synthetic-tool-${randomUUID()}`,
    state,
    ...(options.artifactPath ? { artifactPath: options.artifactPath } : {}),
    ...(options.artifactSha256 ? { artifactSha256: options.artifactSha256 } : {}),
    ...(options.error ? { error: options.error } : {}),
    telemetry: options.telemetry ?? { source: 'unavailable', inputTokens: null, outputTokens: null, costUsd: null },
  };
}

export function hashSyntheticArtifact(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

