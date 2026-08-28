import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Info, Lock } from "lucide-react";
import { kpiById } from "@/lib/kpi/definitions";
import { KPI_STATUS_LABELS, type KpiStatus } from "@/lib/kpi/status";
import type { KpiResult } from "@/lib/kpi/scorecard";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<KpiStatus, string> = {
  healthy: "border-transparent bg-green-500/12 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  watch: "border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  weak: "border-transparent bg-orange-500/14 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  critical: "border-transparent bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  insufficient_data: "border-transparent bg-secondary text-muted-foreground",
};

export function KpiCard({ result }: { result: KpiResult }) {
  const def = kpiById(result.kpiId);
  const isBlocked = def.blockedBy !== null;
  const unavailable = result.status === "insufficient_data";

  return (
    <Card className={cn(unavailable && "opacity-90")}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-muted-foreground">{def.name}</p>
          {result.status !== null && (
            <Badge className={cn("shrink-0", STATUS_STYLES[result.status])}>
              {isBlocked ? (
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" strokeWidth={2.5} />
                  Blocked
                </span>
              ) : (
                KPI_STATUS_LABELS[result.status]
              )}
            </Badge>
          )}
        </div>

        <p
          className={cn(
            "font-heading text-[30px] font-semibold leading-none tracking-[-0.03em]",
            unavailable && "text-muted-foreground"
          )}
        >
          {unavailable ? "—" : result.formatted}
        </p>

        {/* Change vs the prior comparable window. */}
        {!unavailable && result.changePct !== null && (
          <div className="flex items-center gap-1.5 text-[13px]">
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                result.isImprovement
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {result.changePct >= 0 ? (
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              {Math.abs(Math.round(result.changePct * 10) / 10)}%
            </span>
            <span className="text-muted-foreground">vs prior period</span>
          </div>
        )}

        {/* Why it can't be judged — never left as a bare dash. */}
        {unavailable && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {result.statusReason}
          </p>
        )}

        {!unavailable && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span>n = {result.sampleSize}</span>
            {result.baseline4wValue !== null && result.varianceVsBaselinePct !== null && (
              <span>
                {result.varianceVsBaselinePct >= 0 ? "+" : ""}
                {Math.round(result.varianceVsBaselinePct)}% vs 4-week baseline
              </span>
            )}
          </div>
        )}

        {result.downgradeReason && (
          <div className="flex gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {result.downgradeReason}
            </p>
          </div>
        )}

        {def.caveat && !unavailable && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{def.caveat}</p>
        )}
      </CardContent>
    </Card>
  );
}
