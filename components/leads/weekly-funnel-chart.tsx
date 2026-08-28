import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import { stageColorClass } from "@/lib/stage-colors";
import type { WeeklyRollup } from "@/lib/pipeline-dashboard";

export function WeeklyFunnelChart({ rollup }: { rollup: WeeklyRollup }) {
  const rows = [
    { label: "New leads", count: rollup.newLeads },
    ...rollup.steps.map((s) => ({ label: s.label, count: s.count })),
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          This week
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <div key={row.label} className="flex items-center gap-4">
            <div className="w-28 shrink-0 truncate text-[13px] text-muted-foreground">
              {row.label}
            </div>
            <div className="flex h-2.5 flex-1 items-center">
              <div
                className={`h-2.5 rounded-full ${stageColorClass(i)}`}
                style={{ width: `${Math.max(3, (row.count / max) * 100)}%` }}
              />
              <span className="ml-3 text-[13px] font-medium tabular-nums">{row.count}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
