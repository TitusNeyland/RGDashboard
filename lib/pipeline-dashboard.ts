import type { opportunities, pipelineEvents, pipelineStages } from "@/drizzle/schema";
import {
  funnelStep,
  stageMatchesStep,
  type FunnelStepKey,
} from "@/lib/pipeline-events/funnel-steps";

type OpportunityRow = typeof opportunities.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LOST_KEYWORDS = ["lost", "dead", "abandon"];

function isTerminalLostStage(stageName: string) {
  const n = stageName.toLowerCase();
  return LOST_KEYWORDS.some((k) => n.includes(k));
}

// --- "This Week" rollup ------------------------------------------------

/** The milestones the doc's "This Week" example lists, in its order. */
const WEEKLY_STEP_KEYS: FunnelStepKey[] = [
  "qualified",
  "appointments",
  "visits",
  "offers",
  "contracts",
  "closings",
];

export interface WeeklyRollup {
  newLeads: number;
  steps: { key: string; label: string; count: number }[];
}

/**
 * "This Week" funnel from the spec (new / qualified / appointments / visits
 * / offers / contracts / closings). New leads come straight from GHL's
 * created-at timestamp; every later step is inferred from stage-name
 * keywords on this week's pipeline_events — same heuristic approach as
 * lib/pipeline-events/classify.ts, and just as dependent on RG's real stage
 * names actually containing these words.
 */
export function weeklyRollup(
  opportunityRows: OpportunityRow[],
  eventRows: PipelineEventRow[]
): WeeklyRollup {
  const cutoff = Date.now() - WEEK_MS;
  const newLeads = opportunityRows.filter(
    (o) => o.ghlCreatedAt != null && o.ghlCreatedAt.getTime() >= cutoff
  ).length;

  const recentEvents = eventRows.filter((e) => e.occurredAt.getTime() >= cutoff);

  const steps = WEEKLY_STEP_KEYS.map((key) => {
    const matchedOpportunities = new Set<string>();
    for (const e of recentEvents) {
      if (stageMatchesStep(e.toStageName, key)) {
        matchedOpportunities.add(e.opportunityGhlId);
      }
    }
    return { key, label: funnelStep(key).label, count: matchedOpportunities.size };
  });

  return { newLeads, steps };
}

// --- Stage conversion, time-in-stage, bottleneck ------------------------

export interface FunnelStage {
  stageId: string;
  stageName: string;
  position: number;
  reachedCount: number;
  /** % of this stage's reach that made it to the next forward stage. Null on the last stage. */
  conversionToNextPct: number | null;
  /** Average hours spent in this stage, from completed (observed) visits only. Null with no data yet. */
  avgHoursInStage: number | null;
}

export interface PipelineFunnel {
  pipelineId: string;
  pipelineName: string;
  stages: FunnelStage[];
  bottleneckStageName: string | null;
}

/**
 * Average time spent in each stage, keyed by stageId, computed from
 * consecutive pipeline_events per opportunity — the gap between "entered
 * stage X" and "left stage X" is how long it sat there. Only reflects
 * stages we actually observed a full visit for; an opportunity still
 * sitting in its current stage doesn't contribute a duration for it yet.
 */
export function averageTimeInStageHours(eventRows: PipelineEventRow[]): Map<string, number> {
  const byOpportunity = new Map<string, PipelineEventRow[]>();
  for (const e of eventRows) {
    const list = byOpportunity.get(e.opportunityGhlId) ?? [];
    list.push(e);
    byOpportunity.set(e.opportunityGhlId, list);
  }

  const durationsByStageId = new Map<string, number[]>();
  for (const events of byOpportunity.values()) {
    const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!prev.toStageId) continue;
      const hours = (curr.occurredAt.getTime() - prev.occurredAt.getTime()) / (60 * 60 * 1000);
      const list = durationsByStageId.get(prev.toStageId) ?? [];
      list.push(hours);
      durationsByStageId.set(prev.toStageId, list);
    }
  }

  const avg = new Map<string, number>();
  for (const [stageId, durations] of durationsByStageId) {
    avg.set(stageId, durations.reduce((a, b) => a + b, 0) / durations.length);
  }
  return avg;
}

/**
 * Per-pipeline stage funnel: how many currently-active (or already-won)
 * opportunities have reached each stage, conversion to the next stage, and
 * average time spent there. Lost/abandoned opportunities are excluded from
 * "reached" counts entirely — GHL commonly moves a lost opportunity
 * straight to a terminal stage regardless of how far it actually got, so
 * trusting their current stage position would overstate how many leads
 * really made it through the earlier stages. This undercounts rather than
 * risks overstating conversion.
 */
export function buildPipelineFunnels(
  opportunityRows: OpportunityRow[],
  stageRows: PipelineStageRow[],
  eventRows: PipelineEventRow[]
): PipelineFunnel[] {
  const avgHoursByStageId = averageTimeInStageHours(eventRows);

  const stagesByPipeline = new Map<string, PipelineStageRow[]>();
  for (const s of stageRows) {
    const list = stagesByPipeline.get(s.pipelineId) ?? [];
    list.push(s);
    stagesByPipeline.set(s.pipelineId, list);
  }

  const funnels: PipelineFunnel[] = [];
  for (const [pipelineId, stagesForPipeline] of stagesByPipeline) {
    const forwardStages = stagesForPipeline
      .filter((s) => !isTerminalLostStage(s.stageName ?? ""))
      .sort((a, b) => a.position - b.position);
    if (forwardStages.length === 0) continue;

    const positionByStageId = new Map(stagesForPipeline.map((s) => [s.stageId, s.position]));
    const activeOpps = opportunityRows.filter((o) => {
      if (o.pipelineId !== pipelineId) return false;
      const status = (o.status ?? "").toLowerCase();
      if (status === "lost" || status === "abandoned") return false;
      if (isTerminalLostStage(o.stageName ?? "")) return false;
      return true;
    });

    const reachedCounts = forwardStages.map(
      (stage) =>
        activeOpps.filter((o) => {
          const currentPos = o.stageId ? positionByStageId.get(o.stageId) : undefined;
          return currentPos != null && currentPos >= stage.position;
        }).length
    );

    const stages: FunnelStage[] = forwardStages.map((stage, i) => {
      const reachedCount = reachedCounts[i];
      const nextReached = i + 1 < reachedCounts.length ? reachedCounts[i + 1] : null;
      const conversionToNextPct =
        nextReached != null && reachedCount > 0
          ? Math.round((nextReached / reachedCount) * 1000) / 10
          : null;
      return {
        stageId: stage.stageId,
        stageName: stage.stageName ?? "Unnamed stage",
        position: stage.position,
        reachedCount,
        conversionToNextPct,
        avgHoursInStage: avgHoursByStageId.get(stage.stageId) ?? null,
      };
    });

    let bottleneck: FunnelStage | null = null;
    for (const s of stages) {
      if (s.conversionToNextPct == null || s.reachedCount < 2) continue;
      if (!bottleneck || s.conversionToNextPct < (bottleneck.conversionToNextPct ?? 100)) {
        bottleneck = s;
      }
    }

    funnels.push({
      pipelineId,
      pipelineName: stagesForPipeline[0]?.pipelineName ?? pipelineId,
      stages,
      bottleneckStageName: bottleneck?.stageName ?? null,
    });
  }

  return funnels;
}
