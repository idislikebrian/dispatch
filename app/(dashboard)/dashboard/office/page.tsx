"use client";

import styles from "./page.module.css";
import {
  ActivityIcon,
  LightningIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@phosphor-icons/react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockAgents = [
  { name: "OpenClaw", status: "online", lastRun: "2m ago" },
  { name: "June", status: "online", lastRun: "5m ago" },
  { name: "Kimi Sub-Agent", status: "idle", lastRun: "1h ago" },
];

const mockActivity = [
  { time: "11:02", agent: "OpenClaw", action: "Synced CRM", result: "Success" },
  { time: "10:58", agent: "June", action: "Cleared Inbox Batch", result: "Success" },
  { time: "10:42", agent: "Kimi", action: "Generated Report", result: "Success" },
];

export default function OfficePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Office</h1>
      </div>

      <div className={styles.grid}>
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.sectionTitle}>
              <ActivityIcon size={18} />
              System Status
            </CardTitle>
            <CardDescription>Agent health overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className={styles.agentList}>
              {mockAgents.map((agent) => (
                <li key={agent.name} className={styles.agentItem}>
                  <div className={styles.agentName}>
                    <span
                      className={`${styles.statusDot} ${
                        agent.status === "online"
                          ? styles.online
                          : styles.idle
                      }`}
                    />
                    {agent.name}
                  </div>

                  <div className={styles.agentMeta}>
                    <ClockIcon size={14} />
                    {agent.lastRun}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.sectionTitle}>
              <LightningIcon size={18} />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system actions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className={styles.activityList}>
              {mockActivity.map((entry, index) => (
                <li key={index} className={styles.activityItem}>
                  <span className={styles.time}>{entry.time}</span>
                  <span>{entry.agent}</span>
                  <span>{entry.action}</span>
                  <span className={styles.success}>
                    <CheckCircleIcon size={14} />
                    {entry.result}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Manual Triggers */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.sectionTitle}>
              <LightningIcon size={18} />
              Manual Triggers
            </CardTitle>
            <CardDescription>Execute system actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.actions}>
              <Button>Run Sync</Button>
              <Button variant="outline">Reindex Memory</Button>
              <Button variant="outline">Clear Cache</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}