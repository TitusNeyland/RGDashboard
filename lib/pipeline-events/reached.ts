import type { opportunities, pipelineEvents, pipelineStages } from "@/drizzle/schema";
import { stageMatchesStep, type FunnelStepKey } from "@/lib/pipeline-events/funnel-steps";

type OpportunityRow = typeof opportunities.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;

const LOST_KEYWORDS = ["lost", "dead", "abandon"];

export function isTerminalLostStage(stageName: string | null) {
  if (!stageName) return false;
  const n = stageName.toLowerCase();
  return LOST_KEYWORDS.some((k) => n.includes(k));
}

/**
 * Lookup tables built once per report from the synced pipeline stages.
 * Shared by the campaign and employee reports so both answer "did this
 * lead ever reach X?" identically.
 */
export function buildStageIndex(stageRows: PipelineStageRow[]) {
  const positionByStageId = new Map(stageRows.map((s) => [s.stageId, s.position]));
  const nameByStageId = new Map(stageRows.map((s) => [s.stageId, s.stageName]));

  // Lowest stage position per milestone, per pipeline — the bar an
  // opportunity must have reached to count toward that milestone.
  const milestonePositions = new Map<string, Map<FunnelStepKey, number>>();
  for (const stage of stageRows) {
    const perPipeline = milestonePositions.get(stage.pipelineId) ?? new Map();
    for (const key of OUTCOME_KEYS) {
      if (!stageMatchesStep(stage.stageName, key)) continue;
      const current = perPipeline.get(key);
      if (current == null || stage.position < current) perPipeline.set(key, stage.position);
    }
    milestonePositions.set(stage.pipelineId, perPipeline);
  }

  return { positionByStageId, nameByStageId, milestonePositions };
}

export const OUTCOME_KEYS: FunnelStepKey[] = [
  "interested",
  "qualified",
  "appointments",
  "offers",
  "contracts",
  "closings",
];

/**
 * The furthest point an opportunity ever got in its pipeline, as a stage
 * position.
 *
 * Terminal lost/dead stages are skipped rather than counted: they usually
 * sit at the END of a GHL pipeline, so treating "moved to Closed Lost" as a
 * position would credit a dead lead with having passed every milestone
 * before it. Skipping them means a lead that died after "Contacted" is
 * correctly credited with reaching Contacted and nothing further.
 */
export function maxReachedPosition(
  opportunity: OpportunityRow,
  eventsForOpportunity: PipelineEventRow[],
  positionByStageId: Map<string, number>,
  nameByStageId: Map<string, string | null>
): number | null {
  const candidateStageIds = [
    ...(opportunity.stageId ? [opportunity.stageId] : []),
    ...eventsForOpportunity.map((e) => e.toStageId).filter((id): id is string => id != null),
  ];

  let max: number | null = null;
  for (const stageId of candidateStageIds) {
    if (isTerminalLostStage(nameByStageId.get(stageId) ?? null)) continue;
    const position = positionByStageId.get(stageId);
    if (position == null) continue;
    if (max == null || position > max) max = position;
  }
  return max;
}

/** Groups events by opportunity once, so callers don't re-scan the list. */
export function groupEventsByOpportunity(eventRows: PipelineEventRow[]) {
  const map = new Map<string, PipelineEventRow[]>();
  for (const e of eventRows) {
    const list = map.get(e.opportunityGhlId) ?? [];
    list.push(e);
    map.set(e.opportunityGhlId, list);
  }
  return map;
}

/** Milestones no pipeline has a stage for — must render as "not tracked", never 0. */
export function untrackedMilestones(stageRows: PipelineStageRow[]): FunnelStepKey[] {
  return OUTCOME_KEYS.filter(
    (key) => !stageRows.some((stage) => stageMatchesStep(stage.stageName, key))
  );
}
