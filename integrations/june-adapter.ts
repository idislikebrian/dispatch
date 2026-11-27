import { randomUUID } from "node:crypto";
import { signRequest } from "@/lib/security/signing";

export type DispatchProject = "Cobalt" | "Caminos" | "HIGHER" | "Aluminum" | "Experimental";
export type DispatchEventType = "action" | "error" | "info" | "warning";

export interface JuneTelemetry {
  type: DispatchEventType;
  message: string;
  project: DispatchProject;
  agentType?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

/** The two identifiers are different values: the key id selects the credential,
 * the agent name is what that credential is bound to. */
export interface DispatchIdentity {
  keyId: string;
  agentName: string;
}

export interface DispatchRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
}

/**
 * Harness-independent request builder for June's authenticated telemetry.
 * It signs only bounded operational metadata; private conversation or tool
 * payloads are intentionally not accepted by this adapter.
 */
export function buildSignedRequest(
  endpoint: string,
  identity: DispatchIdentity,
  secret: string,
  telemetry: JuneTelemetry,
  nowMs = Date.now(),
  nonce: string = randomUUID(),
): DispatchRequest {
  if (!identity.keyId || !identity.agentName || !secret) throw new Error("keyId, agentName and secret are required");
  if (!telemetry.message || telemetry.message.length > 500) throw new Error("message must be 1–500 characters");
  const body = JSON.stringify({
    agentName: identity.agentName,
    agentType: telemetry.agentType ?? "openclaw",
    type: telemetry.type,
    message: telemetry.message,
    project: telemetry.project,
    metadata: telemetry.metadata,
  });
  const timestamp = String(nowMs);
  const requestId = telemetry.requestId ?? randomUUID();
  const path = endpoint.startsWith("http") ? new URL(endpoint).pathname : endpoint.split("?")[0];
  const signature = signRequest(secret, "POST", path, timestamp, nonce, body);
  return {
    url: endpoint,
    body,
    headers: {
      "content-type": "application/json",
      "x-dispatch-key-id": identity.keyId,
      "x-dispatch-timestamp": timestamp,
      "x-dispatch-nonce": nonce,
      "x-dispatch-signature": signature,
      "idempotency-key": requestId,
    },
  };
}

export function verifySignedRequest(request: DispatchRequest, secret: string, maxSkewMs = 300_000): boolean {
  const timestamp = Number(request.headers["x-dispatch-timestamp"]);
  const nonce = request.headers["x-dispatch-nonce"];
  const supplied = request.headers["x-dispatch-signature"];
  if (!Number.isFinite(timestamp) || !nonce || !supplied || Math.abs(Date.now() - timestamp) > maxSkewMs) return false;
  const path = request.url.startsWith("http") ? new URL(request.url).pathname : request.url.split("?")[0];
  const expected = signRequest(secret, "POST", path, String(timestamp), nonce, request.body);
  return supplied === expected;
}

