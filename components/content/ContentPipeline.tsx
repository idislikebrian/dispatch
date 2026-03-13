"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import styles from "./ContentPipeline.module.css";

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  stage: string;
  ownerName: string;
}

interface ContentListResponse {
  data: ContentItem[];
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

interface ContentPipelineProps {
  filterStage?: string | null;
}

export default function ContentPipeline({ filterStage }: ContentPipelineProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = filterStage ? `?stage=${filterStage}` : "";
        const data = await fetchAPI<ContentListResponse>(`/api/content${query}`);
        setContent(data.data || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch content");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterStage]);

  if (loading) {
    return <div className={styles.container} />;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // Group items by stage
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
                <span className={styles.count}>{column.items.length}</span>
              </div>
              <div className={styles.columnContent}>
                {column.items.length === 0 ? (
                  <div className={styles.emptyColumn}>—</div>
                ) : (
                  column.items.map((item) => (
                    <div key={item.id} className={styles.card}>
                      <div className={styles.cardTitle}>{item.title}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.platform}>{item.platform}</span>
                        <span className={styles.owner}>{item.ownerName}</span>
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
