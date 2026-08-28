import type { opportunities } from "@/drizzle/schema";

type OpportunityRow = typeof opportunities.$inferSelect;

const STALE_AFTER_DAYS = 7;

export function computeKpis(rows: OpportunityRow[]) {
  const values = rows
    .map((r) => (r.monetaryValue != null ? Number(r.monetaryValue) : null))
    .filter((v): v is number => v != null && !Number.isNaN(v));

  const totalValue = values.reduce((sum, v) => sum + v, 0);
  const avgValue = values.length ? totalValue / values.length : 0;

  const staleCutoff = Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const noRecentActivity = rows.filter((r) => {
    const updated = r.ghlUpdatedAt?.getTime();
    return updated == null || updated < staleCutoff;
  }).length;

  return {
    openCount: rows.length,
    totalValue,
    avgValue,
    noRecentActivity,
  };
}

/**
 * Leads grouped by stage, sorted by volume (not true pipeline order — the
 * sync doesn't persist each pipeline's stage sequence yet, only the stage's
 * own id/name per opportunity).
 */
export function stageBreakdown(rows: OpportunityRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.stageName ?? row.stageId ?? "No stage";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}
