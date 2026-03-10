"use client";

import { useEffect, useState } from "react";
import { CurrencyDollar } from "@phosphor-icons/react";
import { fetchAPI } from "@/lib/api";
import styles from "./CostPanel.module.css";

interface CostSummaryEntry {
  agentName: string;
  totalCost: number;
}

interface CostSummary {
  entries: CostSummaryEntry[];
  total?: number;
}

// Normalise different possible API response shapes
function normaliseSummary(data: unknown): CostSummaryEntry[] {
  if (Array.isArray(data)) return data as CostSummaryEntry[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.entries)) return d.entries as CostSummaryEntry[];
    if (Array.isArray(d.data)) return d.data as CostSummaryEntry[];
  }
  return [];
}

type Period = "24h" | "7d" | "30d";

interface CostRow {
  agentName: string;
  cost24h: number;
  cost7d: number;
  cost30d: number;
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function CostPanel() {
  const [rows, setRows] = useState<CostRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d24, d7, d30] = await Promise.all([
          fetchAPI<CostSummary | CostSummaryEntry[]>("/api/cost/summary?period=24h"),
          fetchAPI<CostSummary | CostSummaryEntry[]>("/api/cost/summary?period=7d"),
          fetchAPI<CostSummary | CostSummaryEntry[]>("/api/cost/summary?period=30d"),
        ]);

        const e24 = normaliseSummary(d24);
        const e7 = normaliseSummary(d7);
        const e30 = normaliseSummary(d30);

        // Build a unified set of agent names
        const names = new Set<string>();
        [...e24, ...e7, ...e30].forEach((e) => names.add(e.agentName));

        const combined: CostRow[] = Array.from(names).map((name) => ({
          agentName: name,
          cost24h: e24.find((e) => e.agentName === name)?.totalCost ?? 0,
          cost7d: e7.find((e) => e.agentName === name)?.totalCost ?? 0,
          cost30d: e30.find((e) => e.agentName === name)?.totalCost ?? 0,
        }));

        // Sort by 30d cost descending
        combined.sort((a, b) => b.cost30d - a.cost30d);

        setRows(combined);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch cost data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const total24h = rows.reduce((s, r) => s + r.cost24h, 0);
  const total7d = rows.reduce((s, r) => s + r.cost7d, 0);
  const total30d = rows.reduce((s, r) => s + r.cost30d, 0);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <CurrencyDollar size={16} />
        <span>Cost Summary</span>
        {error && <span className={styles.errorBadge}>OFFLINE</span>}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Agent</th>
              <th className={`${styles.th} ${styles.right}`}>Cost (24h)</th>
              <th className={`${styles.th} ${styles.right}`}>Cost (7d)</th>
              <th className={`${styles.th} ${styles.right}`}>Cost (30d)</th>
            </tr>
          </thead>
          <tbody>
            {loading && !error && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  Loading…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={4} className={styles.errorRow}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No cost data available
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.agentName} className={styles.row}>
                <td className={styles.td}>{row.agentName}</td>
                <td className={`${styles.td} ${styles.mono} ${styles.right}`}>
                  {fmt(row.cost24h)}
                </td>
                <td className={`${styles.td} ${styles.mono} ${styles.right}`}>
                  {fmt(row.cost7d)}
                </td>
                <td className={`${styles.td} ${styles.mono} ${styles.right}`}>
                  {fmt(row.cost30d)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={`${styles.td} ${styles.totalLabel}`}>TOTAL</td>
                <td className={`${styles.td} ${styles.mono} ${styles.right} ${styles.totalVal}`}>
                  {fmt(total24h)}
                </td>
                <td className={`${styles.td} ${styles.mono} ${styles.right} ${styles.totalVal}`}>
                  {fmt(total7d)}
                </td>
                <td className={`${styles.td} ${styles.mono} ${styles.right} ${styles.totalVal}`}>
                  {fmt(total30d)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
