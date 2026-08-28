import { loadPipelineData } from "@/lib/load-pipeline-data";
import { PageHeader } from "@/components/page-header";
import { evaluateLeadRules, RULE_CATALOG } from "@/lib/rules/lead-rules";
import { StatTile } from "@/components/leads/stat-tile";
import { FlagCard } from "@/components/leads/flag-card";
import { PendingRulesPanel } from "@/components/leads/pending-rules-panel";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

const RULE_LABELS = new Map(RULE_CATALOG.map((r) => [r.id, r.label]));

export default async function AttentionPage() {
  const { opportunities, contacts, events, usingMockData, lastSyncedAt } = await loadPipelineData();
  const flags = evaluateLeadRules(opportunities, contacts, events);
  const pendingRules = RULE_CATALOG.filter((r) => r.status === "needs-data");

  const counts = {
    high: flags.filter((f) => f.priority === "high").length,
    medium: flags.filter((f) => f.priority === "medium").length,
    low: flags.filter((f) => f.priority === "low").length,
  };

  return (
    <>
      <PageHeader
        title="Needs Attention"
        usingMockData={usingMockData}
        lastSyncedAt={lastSyncedAt}
      />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-6">
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <StatTile label="High priority" value={String(counts.high)} icon={AlertCircle} tone="red" />
        <StatTile label="Medium priority" value={String(counts.medium)} icon={AlertTriangle} tone="amber" />
        <StatTile label="Low priority" value={String(counts.low)} icon={Info} tone="blue" />
      </div>

      {flags.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="text-[15px] font-semibold tracking-tight">
              Nothing flagged
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
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
    </>
  );
}
