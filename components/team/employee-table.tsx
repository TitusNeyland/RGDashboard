import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { EmployeeStats } from "@/lib/employees/report";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function EmployeeTable({
  label,
  members,
}: {
  label: string;
  members: EmployeeStats[];
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-black/[0.06] py-5 dark:border-white/10">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          {label}
          <Badge className="border-transparent bg-secondary text-secondary-foreground">
            {members.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Leads worked</TableHead>
            <TableHead className="text-right">Appointments set</TableHead>
            <TableHead className="text-right">Leads advanced</TableHead>
            <TableHead className="text-right">Offers made</TableHead>
            <TableHead className="text-right">Contracts</TableHead>
            <TableHead className="text-right">Conversion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.ghlId ?? m.name}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[11px] font-medium uppercase text-foreground dark:bg-white/10">
                    {m.ghlId == null && m.name === "Unassigned" ? "—" : initials(m.name)}
                  </div>
                  <span className="font-medium">{m.name}</span>
                  {m.user == null && m.name !== "Unassigned" && (
                    <Badge className="border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                      Not in GHL users
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{m.leadsWorked}</TableCell>
              <TableCell className="text-right tabular-nums">{m.appointmentsSet}</TableCell>
              <TableCell className="text-right tabular-nums">{m.leadsAdvanced}</TableCell>
              <TableCell className="text-right tabular-nums">{m.offersMade}</TableCell>
              <TableCell className="text-right tabular-nums">{m.contractsProduced}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {m.conversionRatePct == null ? "—" : `${m.conversionRatePct}%`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
