import { unavailableExecution, type NormalizedExecution } from "../adapter-contract";

/** Synthetic Hermes-shaped event; no Hermes process, credentials, or network is used. */
export interface HermesStubEvent {
  session_id: string;
  status?: "queued" | "running" | "completed" | "failed" | "cancelled";
  model?: { provider?: string; name?: string };
  usage?: { input_tokens?: number; output_tokens?: number; cached_input_tokens?: number; reasoning_tokens?: number };
  cost?: { usd?: number; source?: "measured" | "provider-reported" | "estimated" };
  parent_session_id?: string;
}

export function normalizeHermesStub(event: HermesStubEvent, observedAt: string): NormalizedExecution {
  if (!event.session_id) throw new Error("Hermes stub requires a session_id");
  const base = unavailableExecution({ harness: "hermes", sessionId: event.session_id, ...(event.parent_session_id ? { parentSessionId: event.parent_session_id } : {}) }, observedAt);
  const usage = event.usage;
  const hasUsage = usage && Object.values(usage).some((value) => value !== undefined);
  const input = usage?.input_tokens ?? null;
  const output = usage?.output_tokens ?? null;
  const cachedInput = usage?.cached_input_tokens ?? null;
  const reasoning = usage?.reasoning_tokens ?? null;
  const total = hasUsage && input !== null && output !== null ? input + output : null;
  const costSource = event.cost?.source ?? (event.cost?.usd !== undefined ? "provider-reported" : "unavailable");
  return {
    ...base,
    state: event.status ?? "unknown",
    model: event.model?.name
      ? { provider: event.model.provider ?? null, model: event.model.name, source: "provider-reported" }
      : base.model,
    tokens: hasUsage
      ? { input, output, cachedInput, reasoning, total, source: "provider-reported" }
      : base.tokens,
    cost: event.cost?.usd !== undefined
      ? { usd: event.cost.usd, source: costSource, currency: "USD" }
      : base.cost,
  };
}
