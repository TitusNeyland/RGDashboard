import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import type { CampaignReportRow } from "@/lib/campaigns/report";

function money(value: number | null, fractionDigits = 2) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function percent(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString("en-US")}%`;
}

export function CampaignComparisonTable({ rows }: { rows: CampaignReportRow[] }) {
  // Only campaigns with recorded spend can be compared on cost efficiency.
  const comparable = rows.filter((r) => r.campaign != null);
  if (comparable.length === 0) return null;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-black/[0.06] py-5 dark:border-white/10">
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          Campaign comparison
        </CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Cost / reply</TableHead>
            <TableHead className="text-right">Cost / qualified</TableHead>
            <TableHead className="text-right">Cost / appt</TableHead>
            <TableHead className="text-right">Cost / contract</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Reply rate</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparable.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">{money(row.costPerReply)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {money(row.costPerQualifiedLead)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(row.costPerAppointment)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(row.costPerContract)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(row.outcomes.revenue, 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {percent(row.replyRatePct)}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums ${
                  row.roiPct != null && row.roiPct < 0
                    ? "text-red-600 dark:text-red-400"
                    : ""
                }`}
              >
                {percent(row.roiPct)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
