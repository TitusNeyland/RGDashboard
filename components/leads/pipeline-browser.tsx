"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/leads/stat-tile";
import { StageBarChart } from "@/components/leads/stage-bar-chart";
import { formatCurrency } from "@/lib/dashboard-stats";
import { cn } from "@/lib/utils";
import { LayoutList, DollarSign, TrendingUp, Clock, Table2 } from "lucide-react";

/**
 * A table row, flattened on the server.
 *
 * Only the displayed fields cross to the client — the full opportunity rows
 * carry a JSONB `raw` payload each, and sending 3,000 of those would be
 * megabytes of data the table never reads.
 */
export interface BrowserRow {
  id: string;
  name: string;
  pipelineId: string;
  stageName: string | null;
  stagePosition: number | null;
  ownerName: string | null;
  value: number | null;
  updatedIso: string | null;
}

export interface PipelineSummary {
  id: string;
  name: string;
  count: number;
}

/** Rows rendered before the list is truncated. */
const ROW_LIMIT = 150;

/** Wrapped so the clock is not read directly during render. */
function staleCutoffMs() {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

const STAGE_BADGE_CLASSES = [
  "border-transparent bg-stage-1/18 text-stage-5 font-medium",
  "border-transparent bg-stage-2/18 text-stage-5 font-medium",
  "border-transparent bg-stage-3/18 text-stage-5 font-medium",
  "border-transparent bg-stage-4/18 text-stage-5 font-medium",
  "border-transparent bg-stage-5/18 text-stage-5 font-medium",
];

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function initials(name: string | null) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/**
 * Pipeline picker plus the filtered opportunity table.
 *
 * Filtering happens in the browser rather than through a URL parameter,
 * because `searchParams` are unavailable under the static export — the same
 * constraint the KPI period switcher works around.
 */
export function PipelineBrowser({
  pipelines,
  rows,
  defaultPipelineId,
}: {
  pipelines: PipelineSummary[];
  rows: BrowserRow[];
  defaultPipelineId: string;
}) {
  const [pipelineId, setPipelineId] = useState(defaultPipelineId);

  const selected = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const visible = useMemo(
    () => rows.filter((r) => r.pipelineId === pipelineId),
    [rows, pipelineId]
  );

  // Stage colours follow funnel order, so an early stage stays light and a
  // late one stays dark no matter how many leads sit in each.
  const stageColorIndex = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of visible) {
      if (r.stageName && !seen.has(r.stageName)) {
        seen.set(r.stageName, r.stagePosition ?? 0);
      }
    }
    return new Map(
      [...seen.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([stage], i) => [stage, i] as const)
    );
  }, [visible]);

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of visible) {
      const key = r.stageName ?? "No stage";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([stage, count]) => ({ stage, count }))
      .sort(
        (a, b) =>
          (stageColorIndex.get(a.stage) ?? 99) - (stageColorIndex.get(b.stage) ?? 99)
      );
  }, [visible, stageColorIndex]);

  const values = visible.map((r) => r.value).filter((v): v is number => v != null);
  const total = values.reduce((a, b) => a + b, 0);
  const cutoff = staleCutoffMs();
  const stale = visible.filter(
    (r) => !r.updatedIso || new Date(r.updatedIso).getTime() < cutoff
  ).length;

  const shown = visible.slice(0, ROW_LIMIT);

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline picker */}
      <div className="flex flex-wrap gap-1.5">
        {pipelines.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPipelineId(p.id)}
            aria-pressed={p.id === pipelineId}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-colors",
              p.id === pipelineId
                ? "bg-foreground/[0.08] font-medium text-foreground dark:bg-white/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.name}
            <span className="tabular-nums text-[12px] opacity-60">{p.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Opportunities" value={String(visible.length)} icon={LayoutList} tone="blue" />
        <StatTile label="Total value" value={formatCurrency(total)} icon={DollarSign} tone="green" />
        <StatTile
          label="Avg value"
          value={values.length ? formatCurrency(total / values.length) : "—"}
          icon={TrendingUp}
          tone="violet"
        />
        <StatTile label="No update in 7+ days" value={String(stale)} icon={Clock} tone="amber" />
      </div>

      {stageCounts.length > 0 && <StageBarChart data={stageCounts} />}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-black/[0.06] py-5 dark:border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            {selected?.name ?? "Opportunities"}
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">
            {visible.length > ROW_LIMIT
              ? `Showing the ${ROW_LIMIT} most recently updated of ${visible.length}.`
              : `${visible.length} opportunit${visible.length === 1 ? "y" : "ies"}.`}
          </p>
        </CardHeader>

        {visible.length === 0 ? (
          <CardContent className="py-14 text-center">
            <p className="text-[15px] font-semibold tracking-tight">No opportunities</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
              This pipeline has no synced opportunities.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => {
                const idx = stageColorIndex.get(row.stageName ?? "") ?? 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link href={`/leads/${row.id}`} className="hover:underline">
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.stageName ? (
                        <Badge
                          className={
                            STAGE_BADGE_CLASSES[Math.min(idx, STAGE_BADGE_CLASSES.length - 1)]
                          }
                        >
                          {row.stageName}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[9px] font-semibold uppercase text-muted-foreground dark:bg-white/10">
                          {initials(row.ownerName)}
                        </div>
                        <span className="text-muted-foreground">
                          {row.ownerName ?? "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.value == null
                        ? "—"
                        : row.value.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(row.updatedIso)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
