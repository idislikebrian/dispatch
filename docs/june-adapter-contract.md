# June adapter contract (isolated development)

The adapter sends only a small public telemetry envelope: stable agent identity, bounded event type/message/project, request ID, timestamp, nonce, and HMAC signature. It does not accept or transmit private conversation content, credentials, raw tool output, or operational evidence.

The adapter is harness-independent: an OpenClaw transport can provide the endpoint and secret, while the adapter only builds and verifies requests. The current Dispatch deployment does not yet verify these headers, so this contract is for isolated development and staging tests only. It is not authorization to send signed or unsigned control/telemetry requests to production.

Required server-side gates before use outside the isolated environment: secret provisioning without source control, timestamp skew enforcement, nonce replay cache, idempotency persistence, agent-to-secret binding, authenticated read/control authorization, and explicit acknowledgment of accepted telemetry.
