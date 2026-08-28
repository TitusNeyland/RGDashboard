import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { stageColorClass } from "@/lib/stage-colors";

export function StageBarChart({
  data,
}: {
  data: { stage: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          Leads by stage
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 px-4">
        {data.map((d, i) => (
          <div key={d.stage} className="flex items-center gap-4">
            <div className="w-32 shrink-0 truncate text-[12px] text-muted-foreground">
              {d.stage}
            </div>
            <div className="flex h-2.5 flex-1 items-center">
              <div
                className={`h-2.5 rounded-full ${stageColorClass(i)}`}
                style={{ width: `${Math.max(6, (d.count / max) * 100)}%` }}
              />
              <span className="ml-3 text-[12px] font-medium tabular-nums">
                {d.count}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
