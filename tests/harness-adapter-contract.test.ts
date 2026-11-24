import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHermesStub } from "./stubs/hermes-adapter";

test("normalizes a complete Hermes-shaped observation", () => {
  const result = normalizeHermesStub({
    session_id: "hermes-synthetic-1",
    parent_session_id: "hermes-parent-0",
    status: "completed",
    model: { provider: "synthetic-provider", name: "synthetic-model" },
    usage: { input_tokens: 100, output_tokens: 25, cached_input_tokens: 10, reasoning_tokens: 5 },
    cost: { usd: 0.0123, source: "provider-reported" },
  }, "2026-11-24T12:00:00.000Z");

  assert.deepEqual(result.identity, { harness: "hermes", sessionId: "hermes-synthetic-1", parentSessionId: "hermes-parent-0" });
  assert.equal(result.state, "completed");
  assert.deepEqual(result.model, { provider: "synthetic-provider", model: "synthetic-model", source: "provider-reported" });
  assert.deepEqual(result.tokens, { input: 100, output: 25, cachedInput: 10, reasoning: 5, total: 125, source: "provider-reported" });
  assert.deepEqual(result.cost, { usd: 0.0123, source: "provider-reported", currency: "USD" });
});

test("does not infer identity, model, usage, or cost when Hermes omits them", () => {
  const result = normalizeHermesStub({ session_id: "hermes-synthetic-2", status: "running" }, "2026-11-24T12:01:00.000Z");
  assert.equal(result.identity.sessionId, "hermes-synthetic-2");
  assert.equal(result.state, "running");
  assert.equal(result.model.source, "unavailable");
  assert.equal(result.tokens.source, "unavailable");
  assert.equal(result.cost.source, "unavailable");
  assert.equal(result.cost.usd, null);
});

test("preserves an estimated cost source without upgrading it", () => {
  const result = normalizeHermesStub({ session_id: "hermes-synthetic-3", cost: { usd: 0.02, source: "estimated" } }, "2026-11-24T12:02:00.000Z");
  assert.deepEqual(result.cost, { usd: 0.02, source: "estimated", currency: "USD" });
});

test("requires a harness session identifier", () => {
  assert.throws(() => normalizeHermesStub({ session_id: "" }, "2026-11-24T12:03:00.000Z"), /session_id/);
});
