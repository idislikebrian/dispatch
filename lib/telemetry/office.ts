import { deriveAgentStatus, HEARTBEAT_ONLINE_WINDOW_MS } from "@/lib/agents/status";

export type OfficeAgentState = {
  status: string;
  connectivity: "connected" | "stale" | "never_seen";
  telemetryFreshness: "fresh" | "stale" | "unavailable";
  executionState: string;
  financialMetrics: "available" | "unavailable";
  operationalMetrics: "available" | "unavailable";
};

export function includeInProductionView(isSynthetic: boolean, includeSynthetic = false): boolean {
  return includeSynthetic || !isSynthetic;
}

export function deriveOfficeAgentState(
  heartbeat: { status: string; createdAt: Date } | null,
  latestEvent?: { metadata: unknown } | null,
  now = Date.now(),
): OfficeAgentState {
  const status = deriveAgentStatus(heartbeat?.status, heartbeat?.createdAt, now);
  const age = heartbeat ? now - heartbeat.createdAt.getTime() : null;
  const fresh = age !== null && age <= HEARTBEAT_ONLINE_WINDOW_MS;
  const metadata = latestEvent?.metadata;
  const executionState = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    && typeof (metadata as Record<string, unknown>).executionState === "string"
    ? String((metadata as Record<string, unknown>).executionState)
    : "unavailable";
  return {
    status,
    connectivity: heartbeat ? (fresh ? "connected" : "stale") : "never_seen",
    telemetryFreshness: heartbeat ? (fresh ? "fresh" : "stale") : "unavailable",
    executionState,
    financialMetrics: "unavailable",
    operationalMetrics: latestEvent ? "available" : "unavailable",
  };
}
