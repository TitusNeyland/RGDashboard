"use client";

import { useState } from "react";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { KPI_DEFINITIONS, kpiById, type KpiCategory } from "@/lib/kpi/definitions";
import type { ScorecardPayload } from "@/lib/kpi/scorecard";

const CATEGORY_LABELS: Record<KpiCategory, string> = {
  revenue: "Revenue",
  conversion: "Funnel conversion",
  efficiency: "Efficiency",
  velocity: "Velocity",
  marketing: "Marketing",
  quality: "Quality",
};

const CATEGORY_ORDER: KpiCategory[] = [
  "revenue",
  "conversion",
  "efficiency",
  "marketing",
  "velocity",
  "quality",
];

const BAND_STYLES = {
  high: "border-transparent bg-green-500/12 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  medium: "border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  low: "border-transparent bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400",
} as const;

/**
 * Every period is precomputed on the server, so switching is a lookup rather
 * than a fetch. There is no API route to call under the static export, and
 * searchParams are unavailable there too.
 */
export function ScorecardClient({ payload }: { payload: ScorecardPayload }) {
  const [periodKey, setPeriodKey] = useState<string>("trailing_4w");
  const results = payload.resultsByPeriod[periodKey] ?? [];
  const byId = new Map(results.map((r) => [r.kpiId, r]));

  const computable = KPI_DEFINITIONS.filter((d) => d.blockedBy === null);
  const blocked = KPI_DEFINITIONS.filter((d) => d.blockedBy !== null);

  return (
    <div className="flex flex-col gap-6">
      {/* Period switcher */}
      <div className="flex flex-wrap gap-1.5">
        {payload.periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriodKey(p.key)}
            aria-pressed={p.key === periodKey}
            className={cn(
              "rounded-full px-3 py-1.5 text-[13px] transition-colors",
              p.key === periodKey
                ? "bg-foreground/[0.08] font-medium text-foreground dark:bg-white/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Data confidence */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            <span className="text-[14px] font-medium">Data confidence</span>
            <Badge className={BAND_STYLES[payload.confidence.band]}>
              {payload.confidence.score} / 100
            </Badge>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Every figure below inherits this. Checks that cost points:
          </p>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
            {payload.confidence.checks
              .filter((c) => c.pointsLost > 0)
              .map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[13px]">{c.label}</p>
                    <p className="text-[12px] text-muted-foreground">{c.detail}</p>
                  </div>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                    −{c.pointsLost} ({c.affectedCount}/{c.totalCount})
                  </span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      {/* KPIs by category */}
      {CATEGORY_ORDER.map((category) => {
        const defs = computable.filter((d) => d.category === category);
        if (defs.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {defs.map((d) => {
                const r = byId.get(d.id);
                return r ? <KpiCard key={d.id} result={r} /> : null;
              })}
            </div>
          </div>
        );
      })}

      {/* Blocked KPIs, grouped so the missing sources are obvious */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            Awaiting a data source
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">
            These report no value rather than zero — a measurement gap is not a
            business result.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
            {blocked.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="text-[14px]">{kpiById(d.id).name}</span>
                <span className="max-w-md text-[12px] text-muted-foreground">{d.blockedBy}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
