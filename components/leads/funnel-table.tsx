import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Waypoints } from "lucide-react";
import type { PipelineFunnel } from "@/lib/pipeline-dashboard";

function formatDuration(hours: number | null) {
  if (hours == null) return "—";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function FunnelTable({ funnel }: { funnel: PipelineFunnel }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-black/[0.06] py-5 dark:border-white/10">
        <CardTitle className="flex items-center gap-2">
          <Waypoints className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          {funnel.pipelineName} funnel
        </CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Reached</TableHead>
            <TableHead className="text-right">Conversion to next</TableHead>
            <TableHead className="text-right">Avg time in stage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funnel.stages.map((stage) => {
            const isBottleneck = stage.stageName === funnel.bottleneckStageName;
            return (
              <TableRow key={stage.stageId}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {stage.stageName}
                    {isBottleneck && (
                      <Badge className="border-transparent bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        Bottleneck
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{stage.reachedCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {stage.conversionToNextPct != null ? `${stage.conversionToNextPct}%` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatDuration(stage.avgHoursInStage)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
