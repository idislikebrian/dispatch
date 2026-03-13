/**
 * Format a date as relative time (e.g., "5m ago", "yesterday")
 * No external dependencies.
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = Date.now();
    const deltaMs = now - d.getTime();

    if (deltaMs < 0) return "now"; // future date (shouldn't happen)

    const deltaSec = Math.floor(deltaMs / 1000);
    if (deltaSec < 60) return `${deltaSec}s ago`;

    const deltaMin = Math.floor(deltaSec / 60);
    if (deltaMin < 60) return `${deltaMin}m ago`;

    const deltaHr = Math.floor(deltaMin / 60);
    if (deltaHr < 24) return `${deltaHr}h ago`;

    const deltaDay = Math.floor(deltaHr / 24);
    if (deltaDay === 1) return "yesterday";
    if (deltaDay < 7) return `${deltaDay}d ago`;
    if (deltaDay < 30) return `${Math.floor(deltaDay / 7)}w ago`;
    if (deltaDay < 365) return `${Math.floor(deltaDay / 30)}mo ago`;

    return `${Math.floor(deltaDay / 365)}y ago`;
  } catch {
    return isoString;
  }
}
