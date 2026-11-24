import { createHmac, randomUUID } from "node:crypto";

export type DispatchProject = "Cobalt" | "Caminos" | "HIGHER" | "Aluminum" | "Experimental";
export type DispatchEventType = "action" | "error" | "info" | "warning";

export interface JuneTelemetry {
  type: DispatchEventType;
  message: string;
  project: DispatchProject;
  requestId?: string;
}

export interface DispatchRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
}

/**
 * Harness-independent, synthetic-data-safe request builder for June.
 * It signs only the public telemetry envelope; private conversation or tool
 * payloads are intentionally not accepted by this adapter.
 */
export function buildSignedRequest(
  endpoint: string,
  agentId: string,
  secret: string,
  telemetry: JuneTelemetry,
  nowMs = Date.now(),
  nonce: string = randomUUID(),
): DispatchRequest {
  if (!agentId || !secret) throw new Error("agentId and secret are required");
  if (!telemetry.message || telemetry.message.length > 500) throw new Error("message must be 1–500 characters");
  const body = JSON.stringify({
    agentName: agentId,
    type: telemetry.type,
    message: telemetry.message,
    project: telemetry.project,
    requestId: telemetry.requestId ?? randomUUID(),
  });
  const timestamp = String(nowMs);
  const signingInput = `${timestamp}.${nonce}.${body}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest("hex");
  return {
    url: endpoint,
    body,
    headers: {
      "content-type": "application/json",
      "x-dispatch-agent": agentId,
      "x-dispatch-timestamp": timestamp,
      "x-dispatch-nonce": nonce,
      "x-dispatch-signature": `sha256=${signature}`,
      "idempotency-key": JSON.parse(body).requestId,
    },
  };
}

export function verifySignedRequest(request: DispatchRequest, secret: string, maxSkewMs = 300_000): boolean {
  const timestamp = Number(request.headers["x-dispatch-timestamp"]);
  const nonce = request.headers["x-dispatch-nonce"];
  const supplied = request.headers["x-dispatch-signature"];
  if (!Number.isFinite(timestamp) || !nonce || !supplied || Math.abs(Date.now() - timestamp) > maxSkewMs) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${nonce}.${request.body}`).digest("hex")}`;
  return supplied === expected;
}

