import { loadPipelineData } from "@/lib/load-pipeline-data";
import { evaluateLeadRules } from "@/lib/rules/lead-rules";
import { weeklyRollup, buildPipelineFunnels } from "@/lib/pipeline-dashboard";
import { StatTile } from "@/components/leads/stat-tile";
import { WeeklyFunnelChart } from "@/components/leads/weekly-funnel-chart";
import { FunnelTable } from "@/components/leads/funnel-table";
import { PageHeader } from "@/components/page-header";
import { ListChecks, Clock, CalendarX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { opportunities, contacts, events, stages, usingMockData, lastSyncedAt } =
    await loadPipelineData();

  const flags = evaluateLeadRules(opportunities, contacts, events);
  const stalledCount = flags.filter((f) => f.ruleId === "stalled-in-stage").length;
  const rollup = weeklyRollup(opportunities, events);
  const funnels = buildPipelineFunnels(opportunities, stages, events);

  return (
    <>
      <PageHeader
        title="Overview"
        description="What's moving, what's stuck, and where the pipeline is converting"
        usingMockData={usingMockData}
        lastSyncedAt={lastSyncedAt}
      />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Leads needing action"
          value={String(flags.length)}
          icon={ListChecks}
          tone="amber"
        />
        <StatTile
          label="Leads stalled"
          value={String(stalledCount)}
          icon={Clock}
          tone="red"
        />
        <StatTile
          label="Follow-ups overdue"
          value="—"
          icon={CalendarX}
          tone="violet"
          note="Needs GHL tasks synced"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <WeeklyFunnelChart rollup={rollup} />
        </div>

        <div className="flex flex-col gap-4 xl:col-span-2">
          {funnels.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No pipeline stage data synced yet — run{" "}
              <code className="font-mono text-[12px]">npm run sync</code> against
              a configured GHL account.
            </p>
          ) : (
            funnels.map((funnel) => (
              <FunnelTable key={funnel.pipelineId} funnel={funnel} />
            ))
          )}
        </div>
      </div>
      </div>
    </>
  );
}
