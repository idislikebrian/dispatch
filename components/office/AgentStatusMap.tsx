"use client";

import { useEffect, useState } from "react";
import { Circle, ClockCountdown, FolderOpen, ChartBar } from "@phosphor-icons/react";
import { fetchAPI } from "@/lib/api";
import styles from "./AgentStatusMap.module.css";

interface Agent {
  name: string;
  project?: string;
  status: "online" | "active" | "idle" | "waiting" | "error" | "offline" | string;
  lastHeartbeat: string | null;
  eventCount24h?: number;
}

function deriveStatus(agent: Agent): string {
  if (agent.status === "error") return "error";
  // Derive offline from heartbeat age > 60 seconds
  try {
    if (!agent.lastHeartbeat) return "offline";
    const lastBeat = new Date(agent.lastHeartbeat).getTime();
    const ageMs = Date.now() - lastBeat;
    if (ageMs > 60 * 1000) return "offline";
  } catch {
    // ignore
  }
  // Normalise "active" → "online" and "waiting" → "idle" for display
  if (agent.status === "active") return "online";
  if (agent.status === "waiting") return "idle";
  return agent.status;
}

function formatHeartbeat(ts: string | null): string {
  if (!ts) return "never";
  try {
    const d = new Date(ts);
    const ageMs = Date.now() - d.getTime();
    const ageSec = Math.floor(ageMs / 1000);
    if (ageSec < 60) return `${ageSec}s ago`;
    const ageMin = Math.floor(ageSec / 60);
    if (ageMin < 60) return `${ageMin}m ago`;
    const ageHr = Math.floor(ageMin / 60);
    if (ageHr < 24) return `${ageHr}h ago`;
    return `${Math.floor(ageHr / 24)}d ago`;
  } catch {
    return ts;
  }
}

export default function AgentStatusMap() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAPI<Agent[]>("/api/agents");
        setAgents(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch agents");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.mapHeader}>
        <Circle size={16} weight="fill" />
        <span>Agent Status</span>
        {error && <span className={styles.errorBadge}>OFFLINE</span>}
        <span className={styles.count}>{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
      </div>

      {agents.length === 0 && !error && (
        <div className={styles.empty}>No agents registered</div>
      )}
      {error && agents.length === 0 && (
        <div className={styles.errorMsg}>{error}</div>
      )}

      <div className={styles.grid}>
        {agents.map((agent) => {
          const status = deriveStatus(agent);
          return (
            <div key={agent.name} className={`${styles.card} ${styles[status] ?? ""}`}>
              <div className={styles.cardTop}>
                <span className={`${styles.statusDot} ${styles[`dot_${status}`] ?? styles.dot_offline}`} />
                <span className={styles.agentName}>{agent.name}</span>
                <span className={`${styles.statusLabel} ${styles[`label_${status}`] ?? ""}`}>
                  {status.toUpperCase()}
                </span>
              </div>

              <div className={styles.cardMeta}>
                {agent.project && (
                  <span className={styles.metaItem}>
                    <FolderOpen size={12} />
                    {agent.project}
                  </span>
                )}
                <span className={styles.metaItem}>
                  <ClockCountdown size={12} />
                  {formatHeartbeat(agent.lastHeartbeat)}
                </span>
                {agent.eventCount24h != null && (
                  <span className={styles.metaItem}>
                    <ChartBar size={12} />
                    {agent.eventCount24h.toLocaleString()} events/24h
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
