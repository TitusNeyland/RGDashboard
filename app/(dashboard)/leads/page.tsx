import { loadPipelineData } from "@/lib/load-pipeline-data";
import {
  PipelineBrowser,
  type BrowserRow,
  type PipelineSummary,
} from "@/components/leads/pipeline-browser";
import { ACQUISITION_PIPELINE_ID } from "@/lib/pipeline-config";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const { opportunities, stages, usingMockData } = await loadPipelineData();

  // Stage position per stage id, so the table can colour stages by funnel
  // order rather than by how many leads happen to sit in each.
  const positionByStageId = new Map(stages.map((s) => [s.stageId, s.position]));

  // Flatten to just what the table shows. The full rows each carry a JSONB
  // payload, and sending 3,000 of those to the browser would be megabytes of
  // data nothing renders.
  const rows: BrowserRow[] = opportunities
    .filter((o) => o.pipelineId != null)
    .map((o) => ({
      id: o.id,
      name: o.name ?? "Unnamed lead",
      pipelineId: o.pipelineId!,
      stageName: o.stageName,
      stagePosition: o.stageId ? positionByStageId.get(o.stageId) ?? null : null,
      ownerName: o.ownerName,
      value: o.monetaryValue != null ? Number(o.monetaryValue) : null,
      updatedIso: o.ghlUpdatedAt ? o.ghlUpdatedAt.toISOString() : null,
    }))
    // Most recently updated first, so a truncated list shows the live work.
    .sort((a, b) => (b.updatedIso ?? "").localeCompare(a.updatedIso ?? ""));

  const counts = new Map<string, PipelineSummary>();
  for (const o of opportunities) {
    if (!o.pipelineId) continue;
    const existing = counts.get(o.pipelineId);
    if (existing) existing.count++;
    else
      counts.set(o.pipelineId, {
        id: o.pipelineId,
        name: o.pipelineName ?? o.pipelineId,
        count: 1,
      });
  }

  const pipelines = [...counts.values()].sort((a, b) => b.count - a.count);

  // Open on the acquisition funnel when it has data — it is the pipeline that
  // actually represents deals, even though others hold more records.
  const defaultPipelineId =
    pipelines.find((p) => p.id === ACQUISITION_PIPELINE_ID)?.id ??
    pipelines[0]?.id ??
    "";

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">Opportunities</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Pipelines
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          {pipelines.length} pipeline{pipelines.length === 1 ? "" : "s"} ·{" "}
          {opportunities.length.toLocaleString("en-US")} opportunities in total.
        </p>
      </div>

      {pipelines.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          No opportunities synced yet. Run{" "}
          <code className="font-mono text-[13px]">npm run sync</code>.
        </p>
      ) : (
        <PipelineBrowser
          pipelines={pipelines}
          rows={rows}
          defaultPipelineId={defaultPipelineId}
        />
      )}
    </div>
  );
}
