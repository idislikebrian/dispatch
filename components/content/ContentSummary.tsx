"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import styles from "./ContentSummary.module.css";

interface StageSummary {
  stage: string;
  count: number;
}

interface SummaryResponse {
  summary: StageSummary[];
  total: number;
}

const STAGE_ORDER = ["idea", "draft", "editing", "scheduled", "published", "repurposed", "archived"];

interface ContentSummaryProps {
  onStageFilter?: (stage: string | null) => void;
}

export default function ContentSummary({ onStageFilter }: ContentSummaryProps) {
  const [summary, setSummary] = useState<StageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAPI<SummaryResponse>("/api/content/summary");
        const ordered = STAGE_ORDER.map((stage) => {
          const found = data.summary.find((s) => s.stage === stage);
          return found || { stage, count: 0 };
        });
        setSummary(ordered);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch summary");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStageClick = (stage: string) => {
    const isSelected = selectedStage === stage;
    const newStage = isSelected ? null : stage;
    setSelectedStage(newStage);
    onStageFilter?.(newStage);
  };

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.summaryRow}>
        {STAGE_ORDER.map((stage) => {
          const item = summary.find((s) => s.stage === stage);
          const count = item?.count ?? 0;
          const isSelected = selectedStage === stage;

          return (
            <button
              key={stage}
              className={`${styles.column} ${isSelected ? styles.selected : ""}`}
              onClick={() => handleStageClick(stage)}
            >
              <div className={styles.stageLabel}>{stage.toUpperCase()}</div>
              <div className={styles.count}>{count}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
