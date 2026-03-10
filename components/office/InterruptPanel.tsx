"use client";

import { useEffect, useState } from "react";
import { Terminal, CheckCircle, XCircle } from "@phosphor-icons/react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import styles from "./InterruptPanel.module.css";

interface Agent {
  name: string;
  status: string;
}

type CommandType = "pause" | "resume" | "stop" | "summarize" | "custom";

const COMMAND_TYPES: CommandType[] = ["pause", "resume", "stop", "summarize", "custom"];

export default function InterruptPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentName, setAgentName] = useState("");
  const [commandType, setCommandType] = useState<CommandType>("pause");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAPI<Agent[]>("/api/agents");
        setAgents(data);
        if (data.length > 0 && !agentName) {
          setAgentName(data[0].name);
        }
      } catch {
        // silently ignore; agents list may be empty
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentName) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName, type: commandType, message }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }

      setFeedback({ ok: true, text: `Interrupt sent: ${commandType} → ${agentName}` });
      setMessage("");
    } catch (e) {
      setFeedback({
        ok: false,
        text: e instanceof Error ? e.message : "Failed to send interrupt",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles.panelTitle}>
          <Terminal size={16} />
          Interrupt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="interrupt-agent">
              Agent
            </label>
            <select
              id="interrupt-agent"
              className={styles.select}
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              required
            >
              {agents.length === 0 && (
                <option value="" disabled>
                  Loading agents…
                </option>
              )}
              {agents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="interrupt-type">
              Command
            </label>
            <select
              id="interrupt-type"
              className={styles.select}
              value={commandType}
              onChange={(e) => setCommandType(e.target.value as CommandType)}
            >
              {COMMAND_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="interrupt-msg">
              Message <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="interrupt-msg"
              className={styles.input}
              type="text"
              placeholder="Additional payload…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {feedback && (
            <div
              className={`${styles.feedback} ${feedback.ok ? styles.feedbackOk : styles.feedbackErr}`}
            >
              {feedback.ok ? (
                <CheckCircle size={14} weight="fill" />
              ) : (
                <XCircle size={14} weight="fill" />
              )}
              {feedback.text}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !agentName}
            className={styles.submitBtn}
          >
            {submitting ? "Sending…" : "Send Interrupt"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
