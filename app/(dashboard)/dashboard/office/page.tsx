"use client";

import styles from "./page.module.css";
import AgentStatusMap from "@/components/office/AgentStatusMap";
import ActivityFeed from "@/components/office/ActivityFeed";
import InterruptPanel from "@/components/office/InterruptPanel";
import CostPanel from "@/components/office/CostPanel";
import LiveIndicator from "@/components/office/LiveIndicator";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function OfficePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Office</h1>
        <LiveIndicator />
      </div>

      <div className={styles.layout}>
        {/* Top row: Agent Status Map (full width) */}
        <div className={styles.row}>
          <Card className={styles.fullWidth}>
            <CardContent className={styles.noPadding}>
              <AgentStatusMap />
            </CardContent>
          </Card>
        </div>

        {/* Middle row: Activity Feed (2/3) + Interrupt Panel (1/3) */}
        <div className={styles.midRow}>
          <Card className={styles.activityCard}>
            <CardContent className={styles.noPadding}>
              <ActivityFeed />
            </CardContent>
          </Card>

          <div className={styles.interruptCard}>
            <InterruptPanel />
          </div>
        </div>

        {/* Bottom row: Cost Panel (full width) */}
        <div className={styles.row}>
          <Card className={styles.fullWidth}>
            <CardContent className={styles.noPadding}>
              <CostPanel />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
