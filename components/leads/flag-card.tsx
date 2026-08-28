import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LeadFlag } from "@/lib/rules/lead-rules";

const PRIORITY_STYLES: Record<LeadFlag["priority"], string> = {
  high: "border-transparent bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  medium:
    "border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  low: "border-transparent bg-secondary text-secondary-foreground",
};

const PRIORITY_LABEL: Record<LeadFlag["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function FlagCard({ flag, ruleLabel }: { flag: LeadFlag; ruleLabel: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-medium">{flag.leadName}</p>
            <p className="text-[13px] text-muted-foreground">{ruleLabel}</p>
          </div>
          <Badge className={PRIORITY_STYLES[flag.priority]}>
            {PRIORITY_LABEL[flag.priority]}
          </Badge>
        </div>

        <div className="grid gap-2 text-[14px] sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              What&apos;s wrong
            </p>
            <p className="mt-0.5">{flag.whatIsWrong}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Why it matters
            </p>
            <p className="mt-0.5 text-muted-foreground">{flag.whyItMatters}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3 dark:border-white/10">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Recommended action
            </p>
            <p className="mt-0.5 text-[14px]">{flag.recommendedAction}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[11px] font-medium uppercase text-foreground dark:bg-white/10">
              {flag.assignedEmployee === "Unassigned" ? "—" : initials(flag.assignedEmployee)}
            </div>
            <span className="text-[13px] text-muted-foreground">{flag.assignedEmployee}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
