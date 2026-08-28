import type {
  campaigns,
  contacts,
  opportunities,
  pipelineEvents,
  pipelineStages,
} from "@/drizzle/schema";
import { groupOpportunitiesByCampaign } from "@/lib/campaigns/attribution";
import { stageMatchesStep, type FunnelStepKey } from "@/lib/pipeline-events/funnel-steps";

type OpportunityRow = typeof opportunities.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type CampaignRow = typeof campaigns.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;

const LOST_KEYWORDS = ["lost", "dead", "abandon"];

function isTerminalLostStage(stageName: string | null) {
  if (!stageName) return false;
  const n = stageName.toLowerCase();
  return LOST_KEYWORDS.some((k) => n.includes(k));
}

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
function maxReachedPosition(
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

export interface CampaignOutcomes {
  leads: number;
  interested: number;
  qualified: number;
  appointments: number;
  offers: number;
  contracts: number;
  closings: number;
  revenue: number;
}

export interface CampaignReportRow {
  campaign: CampaignRow | null;
  key: string | null;
  name: string;
  outcomes: CampaignOutcomes;
  /** All null when the campaign has no recorded cost. */
  costPerReply: number | null;
  costPerQualifiedLead: number | null;
  costPerAppointment: number | null;
  costPerContract: number | null;
  /** replies / delivered, as a percentage. Null without delivery data. */
  replyRatePct: number | null;
  /** qualified / delivered, as a percentage — the doc's "conversion rate". */
  deliveredToQualifiedPct: number | null;
  /** (revenue - cost) / cost, as a percentage. */
  roiPct: number | null;
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
 * Milestones no pipeline has a stage for. These must render as "not
 * tracked", never as 0 — "0 appointments" means none were set, while an
 * untracked milestone means RG's pipeline has no stage representing it, so
 * this app has no way to see it. Conflating the two would quietly report a
 * measurement gap as a business result.
 */
export function untrackedMilestones(stageRows: PipelineStageRow[]): FunnelStepKey[] {
  return OUTCOME_KEYS.filter(
    (key) => !stageRows.some((stage) => stageMatchesStep(stage.stageName, key))
  );
}

function ratio(numerator: number, denominator: number | null | undefined) {
  if (denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}

function pct(numerator: number, denominator: number | null | undefined) {
  const r = ratio(numerator, denominator);
  return r == null ? null : Math.round(r * 1000) / 10;
}

/**
 * Computes what each campaign actually produced in the pipeline, and joins
 * it to the delivery numbers RG imported — this is the doc's core ask,
 * "connecting marketing activity to pipeline results."
 *
 * Outcome counts are "ever reached this milestone", not "sitting there
 * now", so a campaign gets credit for a qualified lead even after that lead
 * advanced past qualification or later died.
 */
export function buildCampaignReport(
  campaignRows: CampaignRow[],
  opportunityRows: OpportunityRow[],
  contactRows: ContactRow[],
  eventRows: PipelineEventRow[],
  stageRows: PipelineStageRow[]
): CampaignReportRow[] {
  const positionByStageId = new Map(stageRows.map((s) => [s.stageId, s.position]));
  const nameByStageId = new Map(stageRows.map((s) => [s.stageId, s.stageName]));

  const eventsByOpportunity = new Map<string, PipelineEventRow[]>();
  for (const e of eventRows) {
    const list = eventsByOpportunity.get(e.opportunityGhlId) ?? [];
    list.push(e);
    eventsByOpportunity.set(e.opportunityGhlId, list);
  }

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

  const grouped = groupOpportunitiesByCampaign(opportunityRows, contactRows, campaignRows);

  function outcomesFor(opps: OpportunityRow[]): CampaignOutcomes {
    const counts: Record<string, number> = Object.fromEntries(
      OUTCOME_KEYS.map((k) => [k, 0])
    );
    let revenue = 0;

    for (const opp of opps) {
      const reached = maxReachedPosition(
        opp,
        eventsByOpportunity.get(opp.ghlId) ?? [],
        positionByStageId,
        nameByStageId
      );
      const perPipeline = opp.pipelineId ? milestonePositions.get(opp.pipelineId) : undefined;
      if (reached != null && perPipeline) {
        for (const key of OUTCOME_KEYS) {
          const bar = perPipeline.get(key);
          if (bar != null && reached >= bar) counts[key]++;
        }
      }
      // Revenue counts only deals GHL marks won — a signed contract that
      // hasn't closed is real pipeline, not realized revenue.
      if ((opp.status ?? "").toLowerCase() === "won" && opp.monetaryValue) {
        const value = Number(opp.monetaryValue);
        if (!Number.isNaN(value)) revenue += value;
      }
    }

    return {
      leads: opps.length,
      interested: counts.interested,
      qualified: counts.qualified,
      appointments: counts.appointments,
      offers: counts.offers,
      contracts: counts.contracts,
      closings: counts.closings,
      revenue,
    };
  }

  const rows: CampaignReportRow[] = [];

  for (const campaign of campaignRows) {
    const outcomes = outcomesFor(grouped.get(campaign.key) ?? []);
    const costDollars = campaign.costCents != null ? campaign.costCents / 100 : null;

    rows.push({
      campaign,
      key: campaign.key,
      name: campaign.name,
      outcomes,
      costPerReply: costDollars != null ? ratio(costDollars, campaign.replies) : null,
      costPerQualifiedLead: costDollars != null ? ratio(costDollars, outcomes.qualified) : null,
      costPerAppointment: costDollars != null ? ratio(costDollars, outcomes.appointments) : null,
      costPerContract: costDollars != null ? ratio(costDollars, outcomes.contracts) : null,
      replyRatePct: campaign.replies != null ? pct(campaign.replies, campaign.delivered) : null,
      deliveredToQualifiedPct: pct(outcomes.qualified, campaign.delivered),
      roiPct:
        costDollars != null && costDollars > 0
          ? Math.round(((outcomes.revenue - costDollars) / costDollars) * 1000) / 10
          : null,
    });
  }

  // Leads we couldn't tie to any campaign — shown so the totals always
  // reconcile against the pipeline, instead of quietly under-reporting.
  const unattributed = grouped.get(null) ?? [];
  if (unattributed.length > 0) {
    rows.push({
      campaign: null,
      key: null,
      name: "Unattributed",
      outcomes: outcomesFor(unattributed),
      costPerReply: null,
      costPerQualifiedLead: null,
      costPerAppointment: null,
      costPerContract: null,
      replyRatePct: null,
      deliveredToQualifiedPct: null,
      roiPct: null,
    });
  }

  return rows;
}
