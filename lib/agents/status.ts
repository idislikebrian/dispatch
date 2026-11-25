export const HEARTBEAT_ONLINE_WINDOW_MS = 60_000;

export function deriveAgentStatus(status: string | null | undefined, createdAt: Date | string | null | undefined, now = Date.now()): string {
  if (!status || !createdAt) return 'offline';
  return new Date(createdAt).getTime() >= now - HEARTBEAT_ONLINE_WINDOW_MS ? status : 'offline';
}
