import assert from "node:assert/strict";
import test from "node:test";
import { buildSignedRequest, verifySignedRequest } from "../integrations/june-adapter";

test("builds a signed public telemetry envelope", () => {
  const request = buildSignedRequest(
    "http://localhost:3000/api/ingest/event",
    "june-test",
    "synthetic-secret",
    { type: "info", message: "synthetic isolated test", project: "Experimental", requestId: "req-1" },
    Date.now(),
    "nonce-1",
  );
  assert.equal(request.headers["idempotency-key"], "req-1");
  assert.equal(JSON.parse(request.body).agentName, "june-test");
  assert.equal(verifySignedRequest(request, "synthetic-secret"), true);
});

test("rejects tampering, replay-age, and private payload shape", () => {
  const request = buildSignedRequest(
    "http://localhost:3000/api/ingest/event",
    "june-test",
    "synthetic-secret",
    { type: "action", message: "synthetic action", project: "Experimental" },
    Date.now(),
    "nonce-2",
  );
  request.body = request.body.replace("synthetic action", "tampered");
  assert.equal(verifySignedRequest(request, "synthetic-secret"), false);
  assert.throws(() => buildSignedRequest("/event", "june-test", "secret", { type: "info", message: "x".repeat(501), project: "Experimental" }));
});

