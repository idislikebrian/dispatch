"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import styles from "./LiveIndicator.module.css";

interface ActivityEvent {
  id: string;
  timestamp: string;
}

type StatusLevel = "green" | "yellow" | "grey";

function getStatus(lastTimestamp: string | null): StatusLevel {
  if (!lastTimestamp) return "grey";
  const ageMs = Date.now() - new Date(lastTimestamp).getTime();
  if (ageMs < 10_000) return "green";
  if (ageMs < 60_000) return "yellow";
  return "grey";
}

export default function LiveIndicator() {
  const [status, setStatus] = useState<StatusLevel>("grey");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const events = await fetchAPI<ActivityEvent[]>("/api/activity");
        if (!cancelled) {
          const latest = events[0]?.timestamp ?? null;
          setStatus(getStatus(latest));
        }
      } catch {
        if (!cancelled) setStatus("grey");
      }
    }

    poll();
    const id = setInterval(poll, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <span className={styles.wrapper}>
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
      <span className={styles.label}>LIVE</span>
    </span>
  );
}
