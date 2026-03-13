"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import styles from "./ContentList.module.css";

interface ContentItem {
  id: string;
  title: string;
  project: string;
  platform: string;
  stage: string;
  ownerName: string;
  createdAt: string;
}

interface ContentListResponse {
  data: ContentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const STAGE_COLORS: Record<string, string> = {
  idea: "#6b7280",
  draft: "#d97706",
  editing: "#2563eb",
  scheduled: "#ea580c",
  published: "#16a34a",
  repurposed: "#7c3aed",
  archived: "#374151",
};

interface ContentListProps {
  filterStage?: string | null;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default function ContentList({ filterStage }: ContentListProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = filterStage ? `?stage=${filterStage}` : "";
        const data = await fetchAPI<ContentListResponse>(`/api/content${query}`);
        setItems(data.data || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch content");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterStage]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>Content List</div>

      {error && (
        <div className={styles.errorRow}>{error}</div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Title</th>
              <th className={styles.th}>Project</th>
              <th className={styles.th}>Platform</th>
              <th className={styles.th}>Stage</th>
              <th className={styles.th}>Owner</th>
              <th className={styles.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && !error && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && !error && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No content items
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className={styles.row}>
                <td className={styles.td}>{item.title}</td>
                <td className={styles.td}>{item.project}</td>
                <td className={styles.td}>{item.platform}</td>
                <td className={styles.td}>
                  <span
                    className={styles.badge}
                    style={{
                      borderColor: STAGE_COLORS[item.stage] || "#999",
                      color: STAGE_COLORS[item.stage] || "#999",
                    }}
                  >
                    {item.stage}
                  </span>
                </td>
                <td className={styles.td}>{item.ownerName}</td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {formatDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
