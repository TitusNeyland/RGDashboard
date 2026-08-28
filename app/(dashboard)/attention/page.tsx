import { loadPipelineData } from "@/lib/load-pipeline-data";
import { evaluateLeadRules, RULE_CATALOG } from "@/lib/rules/lead-rules";
import { StatTile } from "@/components/leads/stat-tile";
import { FlagCard } from "@/components/leads/flag-card";
import { PendingRulesPanel } from "@/components/leads/pending-rules-panel";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

const RULE_LABELS = new Map(RULE_CATALOG.map((r) => [r.id, r.label]));

export default async function AttentionPage() {
  const { opportunities, contacts, events, usingMockData } = await loadPipelineData();
  const flags = evaluateLeadRules(opportunities, contacts, events);
  const pendingRules = RULE_CATALOG.filter((r) => r.status === "needs-data");

  const counts = {
    high: flags.filter((f) => f.priority === "high").length,
    medium: flags.filter((f) => f.priority === "medium").length,
    low: flags.filter((f) => f.priority === "low").length,
  };

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">Lead Manager</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Needs attention
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          {flags.length} flagged lead{flags.length === 1 ? "" : "s"} across{" "}
          {RULE_CATALOG.filter((r) => r.status === "active").length} active checks.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <StatTile label="High priority" value={String(counts.high)} icon={AlertCircle} tone="red" />
        <StatTile label="Medium priority" value={String(counts.medium)} icon={AlertTriangle} tone="amber" />
        <StatTile label="Low priority" value={String(counts.low)} icon={Info} tone="blue" />
      </div>

      {flags.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-heading text-xl font-semibold tracking-tight">
              Nothing flagged
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted-foreground">
              Every open opportunity clears the active checks below.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {flags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              ruleLabel={RULE_LABELS.get(flag.ruleId) ?? flag.ruleId}
            />
          ))}
        </div>
      )}

      <PendingRulesPanel rules={pendingRules} />
    </div>
  );
}
