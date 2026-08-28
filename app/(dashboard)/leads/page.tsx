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
import { computeKpis, formatCurrency, stageBreakdown } from "@/lib/dashboard-stats";
import { loadPipelineData } from "@/lib/load-pipeline-data";
import { PageHeader } from "@/components/page-header";
import { LayoutList, DollarSign, TrendingUp, Clock, GitBranch, Table2 } from "lucide-react";

export const dynamic = "force-dynamic";

function formatValue(value: string | null) {
  if (!value) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatRelative(date: Date | null) {
  if (!date) return "—";
  const ms = Date.now() - date.getTime();
  const minutes = Math.round(ms / 60_000);
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

// Light tint of each stage's ramp color as background, with the ramp's
// darkest (most-contrast) step reused as text ink — so identity comes from
// the hue, not from a background dark enough to need white text. A 6th+
// stage reuses the darkest slot rather than cycling back to the lightest.
const STAGE_BADGE_CLASSES = [
  "border-transparent bg-stage-1/18 text-stage-5 font-medium",
  "border-transparent bg-stage-2/18 text-stage-5 font-medium",
  "border-transparent bg-stage-3/18 text-stage-5 font-medium",
  "border-transparent bg-stage-4/18 text-stage-5 font-medium",
  "border-transparent bg-stage-5/18 text-stage-5 font-medium",
];
const stageBadgeClass = (i: number) =>
  STAGE_BADGE_CLASSES[Math.min(i, STAGE_BADGE_CLASSES.length - 1)];

export default async function LeadsPage() {
  const { opportunities: rows, usingMockData, lastSyncedAt } = await loadPipelineData();

  const kpis = computeKpis(rows);
  const stages = stageBreakdown(rows);
  const stageColorIndex = new Map(stages.map((s, i) => [s.stage, i]));
  const pipelines = [...rows.reduce((acc, row) => {
    const name = row.pipelineName ?? row.pipelineId ?? "Unknown";
    acc.set(name, (acc.get(name) ?? 0) + 1);
    return acc;
  }, new Map<string, number>())];

  return (
    <>
      <PageHeader
        title="Open Pipeline"
        usingMockData={usingMockData}
        lastSyncedAt={lastSyncedAt}
      />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Open opportunities" value={String(kpis.openCount)} icon={LayoutList} tone="blue" />
        <StatTile label="Total pipeline value" value={formatCurrency(kpis.totalValue)} icon={DollarSign} tone="green" />
        <StatTile label="Avg deal value" value={formatCurrency(kpis.avgValue)} icon={TrendingUp} tone="violet" />
        <StatTile label="No update in 7+ days" value={String(kpis.noRecentActivity)} icon={Clock} tone="amber" />
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3 lg:gap-4">
          <div className="lg:col-span-2">
            <StageBarChart data={stages} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
                Pipelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
                {pipelines.map(([pipeline, count]) => (
                  <li
                    key={pipeline}
                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                  >
                    <span className="truncate pr-3 text-[13px]">{pipeline}</span>
                    <span className="tabular-nums text-[12px] text-muted-foreground">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="gap-0 py-0">
        {rows.length === 0 ? (
          <CardContent className="py-14 text-center">
            <p className="text-[15px] font-semibold tracking-tight">
              No opportunities yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
              Run <code className="font-mono text-[13px]">npm run sync</code>{" "}
              against a configured GHL account to populate the pipeline.
            </p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b border-black/[0.07] px-4 py-3 dark:border-white/10">
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
                All opportunities
              </CardTitle>
            </CardHeader>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const stageKey = row.stageName ?? row.stageId ?? "No stage";
                const colorIndex = stageColorIndex.get(stageKey) ?? 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.pipelineName ?? row.pipelineId ?? "—"}
                    </TableCell>
                    <TableCell>
                      {row.stageName ? (
                        <Badge className={stageBadgeClass(colorIndex)}>
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
                      {formatValue(row.monetaryValue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(row.ghlUpdatedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(row.syncedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </>
        )}
      </Card>
    </div>
    </>
  );
}
