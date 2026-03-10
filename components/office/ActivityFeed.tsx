"use client";

import { useEffect, useState } from "react";
import {
  Lightning,
  Warning,
  Info,
  CheckCircle,
  XCircle,
  Pulse,
} from "@phosphor-icons/react";
import { fetchAPI } from "@/lib/api";
import styles from "./ActivityFeed.module.css";

interface ActivityEvent {
  id: string;
  timestamp: string;
  agentName: string;
  type: "action" | "error" | "info" | "success" | string;
  message: string;
  result?: string;
  metadata?: {
    tokensUsed?: number;
    cost?: number;
    [key: string]: unknown;
  };
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "action":
      return <Lightning size={14} weight="fill" />;
    case "error":
      return <Warning size={14} weight="fill" />;
    case "success":
      return <CheckCircle size={14} weight="fill" />;
    case "info":
    default:
      return <Info size={14} weight="fill" />;
  }
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAPI<ActivityEvent[]>("/api/activity");
        // Most recent first, limit to 50
        const sorted = [...data]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, 50);
        setEvents(sorted);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch activity");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.feed}>
      <div className={styles.feedHeader}>
        <Pulse size={16} />
        <span>Activity Feed</span>
        {error && <span className={styles.errorBadge}>OFFLINE</span>}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Time</th>
              <th className={styles.th}>Agent</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Message</th>
              <th className={styles.th}>Result</th>
              <th className={styles.th}>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && !error && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No activity data
                </td>
              </tr>
            )}
            {error && events.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.errorRow}>
                  {error}
                </td>
              </tr>
            )}
            {events.map((ev) => (
              <tr key={ev.id} className={styles.row}>
                <td className={`${styles.td} ${styles.mono}`}>
                  {formatTimestamp(ev.timestamp)}
                </td>
                <td className={styles.td}>{ev.agentName}</td>
                <td className={styles.td}>
                  <span
                    className={`${styles.typeTag} ${styles[ev.type] ?? styles.info}`}
                  >
                    <EventIcon type={ev.type} />
                    {ev.type}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.message}`}>
                  {ev.message}
                </td>
                <td className={styles.td}>
                  {ev.result === "success" ? (
                    <span className={styles.resultSuccess}>
                      <CheckCircle size={13} weight="fill" /> ok
                    </span>
                  ) : ev.result === "error" ? (
                    <span className={styles.resultError}>
                      <XCircle size={13} weight="fill" /> err
                    </span>
                  ) : (
                    <span className={styles.resultNeutral}>
                      {ev.result ?? "—"}
                    </span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {ev.metadata?.tokensUsed != null
                    ? ev.metadata.tokensUsed.toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
