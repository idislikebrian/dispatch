import assert from "node:assert/strict";
import test from "node:test";
import { deriveOfficeAgentState, includeInProductionView } from "../lib/telemetry/office";

test("production views exclude synthetic records without deleting them", () => {
  assert.equal(includeInProductionView(true), false);
  assert.equal(includeInProductionView(false), true);
  assert.equal(includeInProductionView(true, true), true);
});

test("office state distinguishes loading, stale and fresh telemetry", () => {
  const now = Date.parse("2026-11-26T16:00:00.000Z");
  const missing = deriveOfficeAgentState(null, null, now);
  assert.deepEqual(missing, {
    status: "offline",
    connectivity: "never_seen",
    telemetryFreshness: "unavailable",
    executionState: "unavailable",
    financialMetrics: "unavailable",
    operationalMetrics: "unavailable",
  });

  const stale = deriveOfficeAgentState({ status: "online", createdAt: new Date(now - 61_000) }, null, now);
  assert.equal(stale.connectivity, "stale");
  assert.equal(stale.telemetryFreshness, "stale");

  const fresh = deriveOfficeAgentState(
    { status: "online", createdAt: new Date(now - 1_000) },
    { metadata: { executionState: "completed" } },
    now,
  );
  assert.equal(fresh.connectivity, "connected");
  assert.equal(fresh.telemetryFreshness, "fresh");
  assert.equal(fresh.executionState, "completed");
  assert.equal(fresh.financialMetrics, "unavailable");
});
