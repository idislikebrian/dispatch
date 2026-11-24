import { sha256 } from './signing';

export type IdempotencyDecision = { replay: false; requestHash: string } | { replay: true; requestHash: string };

export function evaluateIdempotency(existingHash: string | null, body: string): IdempotencyDecision {
  const requestHash = sha256(body);
  if (existingHash === null) return { replay: false, requestHash };
  if (existingHash !== requestHash) throw new Error('Idempotency key was reused with a different request');
  return { replay: true, requestHash };
}
