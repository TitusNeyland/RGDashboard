import { loadPipelineData } from "@/lib/load-pipeline-data";
import { evaluateLeadRules } from "@/lib/rules/lead-rules";
import { weeklyRollup, buildPipelineFunnels } from "@/lib/pipeline-dashboard";
import { StatTile } from "@/components/leads/stat-tile";
import { WeeklyFunnelChart } from "@/components/leads/weekly-funnel-chart";
import { FunnelTable } from "@/components/leads/funnel-table";
import { ListChecks, Clock, CalendarX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { opportunities, contacts, events, stages, usingMockData } = await loadPipelineData();

  const flags = evaluateLeadRules(opportunities, contacts, events);
  const stalledCount = flags.filter((f) => f.ruleId === "stalled-in-stage").length;
  const rollup = weeklyRollup(opportunities, events);
  const funnels = buildPipelineFunnels(opportunities, stages, events);

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">Pipeline Dashboard</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Overview
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          What&apos;s moving, what&apos;s stuck, and where the pipeline is
          actually converting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
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

      <WeeklyFunnelChart rollup={rollup} />

      {funnels.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          No pipeline stage data synced yet — run{" "}
          <code className="font-mono text-[13px]">npm run sync</code> against
          a configured GHL account.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {funnels.map((funnel) => (
            <FunnelTable key={funnel.pipelineId} funnel={funnel} />
          ))}
        </div>
      )}
    </div>
  );
}
