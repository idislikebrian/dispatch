"use client";

import { useState } from "react";
import styles from "./page.module.css";
import ContentSummary from "@/components/content/ContentSummary";
import ContentPipeline from "@/components/content/ContentPipeline";
import ContentList from "@/components/content/ContentList";
import { Card, CardContent } from "@/components/ui/card";

export default function ContentPage() {
  const [filterStage, setFilterStage] = useState<string | null>(null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Content</h1>
      </div>

      <div className={styles.layout}>
        {/* Summary cards */}
        <ContentSummary onStageFilter={setFilterStage} />

        {/* Pipeline view */}
        <Card className={styles.fullWidth}>
          <CardContent className={styles.noPadding}>
            <ContentPipeline filterStage={filterStage} />
          </CardContent>
        </Card>

        {/* List view */}
        <Card className={styles.fullWidth}>
          <CardContent className={styles.noPadding}>
            <ContentList filterStage={filterStage} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
