"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import styles from "./ContentPipeline.module.css";
import { getPlatformIcon } from "@/lib/icons";
import { formatRelativeTime } from "@/lib/time";

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  stage: string;
  project: string;
  ownerName: string;
  createdAt: string;
}

// API returns flat array of ContentItem[]

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

interface ContentPipelineProps {
  filterStage?: string | null;
}

export default function ContentPipeline({ filterStage }: ContentPipelineProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = filterStage ? `?stage=${filterStage}` : "";
        const data = await fetchAPI<ContentItem[]>(`/api/content${query}`);
        setContent(data || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch content");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [filterStage]);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // Group items by stage in hardcoded order
  const stages = STAGE_ORDER.map((stage) => ({
    stage,
    items: content.filter((item) => item.stage === stage),
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>Pipeline View</div>
      <div className={styles.pipelineWrapper}>
        <div className={styles.pipeline}>
          {stages.map((column) => (
            <div key={column.stage} className={styles.column}>
              <div
                className={styles.columnHeader}
                style={{ borderTopColor: STAGE_COLORS[column.stage] }}
              >
                <span className={styles.stageName}>{column.stage}</span>
                <span className={styles.count} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {column.items.length}
                </span>
              </div>
              <div className={styles.columnContent}>
                {column.items.length === 0 ? (
                  <div className={styles.emptyColumn}>No items in this stage</div>
                ) : (
                  column.items.map((item) => (
                    <div key={item.id} className={styles.card}>
                      <div className={styles.cardTitle}>
                        <span className={styles.icon}>{getPlatformIcon(item.platform, 14)}</span>
                        <span>{item.title}</span>
                      </div>
                      <div className={styles.cardMeta}>
                        <span>{item.ownerName}</span>
                        <span className={styles.bullet}>•</span>
                        <span>{item.project}</span>
                        <span className={styles.bullet}>•</span>
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
