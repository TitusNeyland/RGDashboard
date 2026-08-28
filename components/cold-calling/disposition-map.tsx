import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tags } from "lucide-react";
import { DISPOSITION_RULES } from "@/lib/cold-calling/dispositions";

function Flag({ on, label }: { on: boolean; label: string }) {
  if (!on) return null;
  return (
    <Badge className="border-transparent bg-secondary text-secondary-foreground">
      {label}
    </Badge>
  );
}

/** §5 — how each operational label feeds the funnel. */
export function DispositionMap() {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-black/[0.06] py-5 dark:border-white/10">
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          Disposition mapping
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Each Wavv/GHL label maps to one reporting category. Confirm these
          against RG&apos;s actual disposition list before baselining — an
          unmapped label is excluded from every rate.
        </p>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Disposition</TableHead>
            <TableHead>Counts toward</TableHead>
            <TableHead>Diagnoses</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DISPOSITION_RULES.map((rule) => (
            <TableRow key={rule.category}>
              <TableCell className="font-medium whitespace-nowrap">{rule.label}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Flag on={rule.isContact} label="Contact" />
                  <Flag on={rule.isMeaningfulConversation} label="Conversation" />
                  <Flag on={rule.isQualifiedLead} label="Qualified" />
                  <Flag on={rule.isAppointment} label="Appointment" />
                  {!rule.isContact && (
                    <span className="text-[13px] text-muted-foreground">Attempt only</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{rule.measurementUse}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
