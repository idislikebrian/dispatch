// Every capability an agent credential can hold. Human operator access is not a
// permission: it comes only from the operator allowlist (see config.ts).
export const AGENT_PERMISSIONS = ['heartbeat:write', 'events:write', 'costs:write', 'telemetry:read', 'interrupts:claim'] as const;
export type AgentPermission = (typeof AGENT_PERMISSIONS)[number];

// A runtime asking to enrol may only request write telemetry. Read and interrupt
// access are granted afterwards by an operator.
export const ENROLLABLE_PERMISSIONS: readonly AgentPermission[] = ['heartbeat:write', 'events:write', 'costs:write'];
