import { loadPipelineData } from "@/lib/load-pipeline-data";
import { buildScorecard } from "@/lib/kpi/scorecard";
import { ScorecardClient } from "@/components/kpi/scorecard-client";

export const dynamic = "force-static";

export default async function KpiPage() {
  const data = await loadPipelineData();

  // The only clock read in the whole KPI path — everything under lib/kpi
  // takes asOf as an argument so results stay deterministic and testable.
  const payload = buildScorecard(
    {
      opportunities: data.opportunities,
      contacts: data.contacts,
      events: data.events,
      stages: data.stages,
      campaigns: data.campaigns,
      usingMockData: data.usingMockData,
    },
    new Date()
  );

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {data.usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">KPI Intelligence</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Scorecard
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Every figure is calculated deterministically from synced data. No
          model produces a number here.
        </p>
      </div>

      <ScorecardClient payload={payload} />
    </div>
  );
}
