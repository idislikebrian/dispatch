export type LeaseInput = { now: Date; leaseMs: number; attempt: number };

export function leaseWindow({ now, leaseMs, attempt }: LeaseInput): { claimedAt: Date; leaseExpiresAt: Date; attempts: number } {
  if (leaseMs <= 0 || leaseMs > 24 * 60 * 60 * 1000) throw new Error('leaseMs must be between 1ms and 24h');
  return { claimedAt: now, leaseExpiresAt: new Date(now.getTime() + leaseMs), attempts: attempt + 1 };
}

export function claimIsActive(leaseExpiresAt: Date | null, now: Date): boolean {
  return leaseExpiresAt !== null && leaseExpiresAt.getTime() > now.getTime();
}
