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
const STAGE_COLORS: Record<string, string> = {
  idea: "#6b7280",
  draft: "#d97706",
  editing: "#2563eb",
  scheduled: "#ea580c",
  published: "#16a34a",
  repurposed: "#7c3aed",
  archived: "#374151",
};

interface ContentSummaryProps {
  onStageFilter?: (stage: string | null) => void;
}

export default function ContentSummary({ onStageFilter }: ContentSummaryProps) {
  const [summary, setSummary] = useState<StageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (stage: string) => {
    const isSelected = selectedStage === stage;
    const newStage = isSelected ? null : stage;
    setSelectedStage(newStage);
    onStageFilter?.(newStage);
  };

  if (loading) {
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.grid}>
        {summary.map((item) => (
          <button
            key={item.stage}
            className={`${styles.card} ${selectedStage === item.stage ? styles.selected : ""}`}
            onClick={() => handleCardClick(item.stage)}
            style={{
              borderTopColor: STAGE_COLORS[item.stage] || "#999",
            }}
          >
            <div className={styles.stageName}>{item.stage}</div>
            <div
              className={styles.count}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {item.count}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
