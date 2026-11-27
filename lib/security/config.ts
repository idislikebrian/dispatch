// Server-side authorization settings. Every one fails closed when unset.
type Env = Record<string, string | undefined>;

export function operatorIds(env: Env = process.env): ReadonlySet<string> {
  return new Set((env.DISPATCH_OPERATOR_USER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean));
}

export function interruptsEnabled(env: Env = process.env): boolean {
  return env.DISPATCH_INTERRUPTS_ENABLED === 'true';
}

export function agentEnrollmentEnabled(env: Env = process.env): boolean {
  return env.DISPATCH_AGENT_ENROLLMENT_ENABLED === 'true';
}
