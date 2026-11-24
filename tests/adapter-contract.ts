/**
 * Harness-neutral observation contract. This file is deliberately test-only:
 * adopting the shape does not add a production ingestion path.
 */
export type Harness = "hermes" | "codex-cli" | "claude-code" | (string & {});
export type ExecutionState = "queued" | "running" | "completed" | "failed" | "cancelled" | "unknown";
export type MeasurementSource = "measured" | "provider-reported" | "estimated" | "unavailable";

export interface SessionIdentity {
  harness: Harness;
  /** Stable ID emitted by or assigned to the harness; never a prompt or credential. */
  sessionId: string;
  /** Optional lineage ID when a resume/fork relation is explicitly reported. */
  parentSessionId?: string;
}

export interface TokenUsage {
  input: number | null;
  output: number | null;
  cachedInput: number | null;
  reasoning: number | null;
  total: number | null;
  source: MeasurementSource;
}

export interface ModelAttribution {
  provider: string | null;
  model: string | null;
  source: MeasurementSource;
}

export interface CostAttribution {
  usd: number | null;
  source: MeasurementSource;
  currency: "USD" | null;
}

export interface NormalizedExecution {
  identity: SessionIdentity;
  state: ExecutionState;
  model: ModelAttribution;
  tokens: TokenUsage;
  cost: CostAttribution;
  observedAt: string;
}

export function unavailableExecution(identity: SessionIdentity, observedAt: string): NormalizedExecution {
  return {
    identity,
    state: "unknown",
    model: { provider: null, model: null, source: "unavailable" },
    tokens: { input: null, output: null, cachedInput: null, reasoning: null, total: null, source: "unavailable" },
    cost: { usd: null, source: "unavailable", currency: null },
    observedAt,
  };
}
