import type {
  campaigns,
  contacts,
  opportunities,
  pipelineEvents,
  pipelineStages,
} from "@/drizzle/schema";
import {
  buildStageIndex,
  groupEventsByOpportunity,
  isTerminalLostStage,
  untrackedMilestones,
} from "@/lib/pipeline-events/reached";
import { stageMatchesStep, type FunnelStepKey } from "@/lib/pipeline-events/funnel-steps";
import { isAcquisitionPipeline, ACQUISITION_PIPELINE_NAME } from "@/lib/pipeline-config";

type OpportunityRow = typeof opportunities.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type CampaignRow = typeof campaigns.$inferSelect;

/**
 * One opportunity, reduced to the timestamps every KPI needs.
 *
 * The existing reporting modules answer "did this lead ever reach X?" via
 * `maxReachedPosition()`. Every KPI in the intelligence spec needs "*when*
 * did it reach X" — for period windows, velocity, and cohort rates. That
 * timestamp exists nowhere in the app today, so it is derived here once and
 * everything downstream is a comparison against it.
 */
export interface OpportunityFact {
  ghlId: string;
  pipelineId: string | null;
  ownerGhlId: string | null;
  source: string | null;
  contactGhlId: string | null;
  createdAt: Date | null;
  /** First time the lead's furthest non-lost stage crossed each milestone bar. */
  firstReachedAt: Partial<Record<FunnelStepKey, Date>>;
  /** Derived close date. Never `syncedAt` — see `deriveWonAt`. */
  wonAt: Date | null;
  /** Assignment fee. `null` (not 0) when absent or unparseable. */
  revenue: number | null;
  isWon: boolean;
  isLost: boolean;
  /** Milestones the current stage clears but no event explains — a data gap. */
  milestonesWithoutEvent: FunnelStepKey[];
  eventCount: number;
}

export interface KpiFactTable {
  facts: OpportunityFact[];
  byGhlId: Map<string, OpportunityFact>;
  /**
   * Earliest recorded event. `pipeline_events` only exists from the first
   * sync onward, so any cohort window starting before this cannot be
   * measured — leads that crossed milestones earlier have no event to date
   * them, and would land in a denominator with no matching numerator. That
   * reads as a total collapse in conversion rather than as missing history,
   * so KPIs must refuse to answer for those windows instead.
   */
  observabilityStart: Date | null;
  /** Milestones with no matching stage in any pipeline — "not tracked", never 0. */
  untracked: FunnelStepKey[];
  /** Opportunities inside the acquisition funnel. */
  totalOpportunities: number;
  /** Opportunities in other pipelines, deliberately excluded from all KPIs. */
  excludedOpportunities: number;
  pipelineName: string;
}

export interface KpiSourceData {
  opportunities: OpportunityRow[];
  contacts: ContactRow[];
  events: PipelineEventRow[];
  stages: PipelineStageRow[];
  campaigns: CampaignRow[];
}

/** Parses a Drizzle `numeric` (a string) without turning absence into zero. */
function parseRevenue(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Removes duplicate and no-op stage events, then clamps timestamps.
 *
 * `pipeline_events` has two writers (`poll_diff` in scripts/sync.ts and the
 * GHL webhook route) and no unique constraint, so the same stage change can
 * be recorded twice with different `occurredAt` values — which a database
 * constraint could not catch. Dropping an event whose `toStageId` matches
 * the previous kept event's still preserves a genuine A→B→A→B bounce,
 * because consecutive `toStageId`s differ there.
 */
function normalizeEvents(
  events: PipelineEventRow[],
  createdAt: Date | null,
  asOf: Date
): PipelineEventRow[] {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const kept: PipelineEventRow[] = [];
  for (const event of sorted) {
    if (event.toStageId && event.toStageId === event.fromStageId) continue; // no-op
    const previous = kept[kept.length - 1];
    if (previous && previous.toStageId === event.toStageId) continue; // duplicate
    kept.push(event);
  }

  // Clamp so history can never run before the lead existed or after now, and
  // never goes backwards. Guards against upstream timestamp bugs poisoning
  // every velocity metric with zero or negative durations.
  let floor = createdAt ? createdAt.getTime() : Number.NEGATIVE_INFINITY;
  return kept.map((event) => {
    const clamped = Math.min(Math.max(event.occurredAt.getTime(), floor), asOf.getTime());
    floor = clamped;
    return clamped === event.occurredAt.getTime()
      ? event
      : { ...event, occurredAt: new Date(clamped) };
  });
}

/**
 * When a deal closed.
 *
 * Order: the first event into a stage that reads as a closing, else the
 * opportunity's last GHL update if it is marked won.
 *
 * It must NEVER fall back to `syncedAt`. That column is rewritten on every
 * sync, so using it would silently relocate all historical revenue into the
 * current period on every single run.
 */
function deriveWonAt(
  opportunity: OpportunityRow,
  events: PipelineEventRow[]
): Date | null {
  if ((opportunity.status ?? "").toLowerCase() !== "won") return null;

  for (const event of events) {
    if (stageMatchesStep(event.toStageName, "closings")) return event.occurredAt;
  }
  return opportunity.ghlUpdatedAt ?? null;
}

/**
 * Builds the fact table. One pass over the data already loaded by
 * `loadPipelineData()`; no additional queries.
 *
 * `asOf` is always injected so the result is deterministic and testable —
 * nothing in `lib/kpi/**` may call `Date.now()` itself.
 */
export function buildKpiFacts(data: KpiSourceData, asOf: Date): KpiFactTable {
  const { positionByStageId, nameByStageId, milestonePositions } = buildStageIndex(data.stages);
  const eventsByOpportunity = groupEventsByOpportunity(data.events);
  const untracked = untrackedMilestones(data.stages);

  let observabilityStart: Date | null = null;
  for (const event of data.events) {
    if (!observabilityStart || event.occurredAt < observabilityStart) {
      observabilityStart = event.occurredAt;
    }
  }

  // KPIs cover the acquisition funnel only. The location has 12 pipelines,
  // most of which track something other than seller deals — employee
  // onboarding, partner recruiting, nurture and lead-score buckets. Including
  // them would put apprentices and partners in the conversion denominators.
  const scoped = data.opportunities.filter((o) => isAcquisitionPipeline(o.pipelineId));

  const facts: OpportunityFact[] = scoped.map((opportunity) => {
    const events = normalizeEvents(
      eventsByOpportunity.get(opportunity.ghlId) ?? [],
      opportunity.ghlCreatedAt,
      asOf
    );

    // Milestone bars are keyed per pipeline; an opportunity with no
    // pipelineId has no bars and can never clear a milestone.
    const bars = opportunity.pipelineId
      ? milestonePositions.get(opportunity.pipelineId)
      : undefined;

    const firstReachedAt: Partial<Record<FunnelStepKey, Date>> = {};
    let runningMax: number | null = null;

    for (const event of events) {
      if (!event.toStageId) continue;

      // Skip backfill observations. On the first sync every opportunity gets
      // one synthetic event recording where it ALREADY sits — we never
      // watched it move there. An event with no from-stage that lands
      // mid-funnel is such an observation, not a transition.
      //
      // Dating milestones from these makes a lead look like it crossed the
      // entire funnel in one instant, which produced 100% appointment-to-offer
      // and offer-to-contract rates against RG's real data. A genuinely new
      // lead entering at position 0 is a real entry and is kept.
      const observedPosition = positionByStageId.get(event.toStageId);
      if (event.fromStageId == null && (observedPosition ?? 0) > 0) continue;
      // A move into a terminal lost stage is not progress — those stages sit
      // at the end of a GHL pipeline, so counting the position would credit
      // a dead lead with every milestone before it.
      if (isTerminalLostStage(nameByStageId.get(event.toStageId) ?? null)) continue;

      const position = positionByStageId.get(event.toStageId);
      if (position == null) continue;
      if (runningMax != null && position <= runningMax) continue;
      runningMax = position;

      if (!bars) continue;
      for (const [milestone, bar] of bars) {
        if (firstReachedAt[milestone]) continue;
        if (runningMax >= bar) firstReachedAt[milestone] = event.occurredAt;
      }
    }

    // Milestones the CURRENT stage clears but no event dates. These are real
    // gaps (history predating the first sync), and must not be silently
    // treated as "never reached" without being surfaced.
    const milestonesWithoutEvent: FunnelStepKey[] = [];
    const currentPosition =
      opportunity.stageId && !isTerminalLostStage(opportunity.stageName)
        ? positionByStageId.get(opportunity.stageId) ?? null
        : null;
    if (bars && currentPosition != null) {
      for (const [milestone, bar] of bars) {
        if (currentPosition >= bar && !firstReachedAt[milestone]) {
          milestonesWithoutEvent.push(milestone);
        }
      }
    }

    const status = (opportunity.status ?? "").toLowerCase();

    return {
      ghlId: opportunity.ghlId,
      pipelineId: opportunity.pipelineId,
      ownerGhlId: opportunity.ownerGhlId,
      source: opportunity.source,
      contactGhlId: opportunity.contactGhlId,
      createdAt: opportunity.ghlCreatedAt,
      firstReachedAt,
      wonAt: deriveWonAt(opportunity, events),
      revenue: parseRevenue(opportunity.monetaryValue),
      isWon: status === "won",
      isLost:
        status === "lost" || status === "abandoned" || isTerminalLostStage(opportunity.stageName),
      milestonesWithoutEvent,
      eventCount: events.length,
    };
  });

  return {
    facts,
    byGhlId: new Map(facts.map((f) => [f.ghlId, f])),
    observabilityStart,
    untracked,
    totalOpportunities: scoped.length,
    excludedOpportunities: data.opportunities.length - scoped.length,
    pipelineName: ACQUISITION_PIPELINE_NAME,
  };
}
