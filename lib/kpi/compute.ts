import type { campaigns, pipelineEvents } from "@/drizzle/schema";
import type { KpiDefinition } from "@/lib/kpi/definitions";
import type { KpiFactTable, OpportunityFact } from "@/lib/kpi/facts";
import { withinPeriod, type PeriodRange } from "@/lib/kpi/periods";
import { averageTimeInStageHours } from "@/lib/pipeline-dashboard";
import type { FunnelStepKey } from "@/lib/pipeline-events/funnel-steps";

type CampaignRow = typeof campaigns.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface KpiValue {
  /** Unrounded. Rounding happens once, at display time. */
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  /** What the sample-size gate judges. Equals the denominator for rates. */
  sampleSize: number;
  /** Cohort members inside the window but too new to have a final outcome. */
  pendingMaturation: number;
}

export interface ComputeContext {
  events: PipelineEventRow[];
  campaigns: CampaignRow[];
  asOf: Date;
}

const EMPTY: KpiValue = {
  value: null,
  numerator: null,
  denominator: null,
  sampleSize: 0,
  pendingMaturation: 0,
};

/**
 * Splits a cohort into members whose outcome is final and members still
 * maturing.
 *
 * Cohort rates are right-censored: a lead created three days ago has not had
 * time to convert, so counting it in the denominator drags a recent window
 * toward zero and reads as a business collapse. Excluding immature members
 * makes the reported number final — it will not revise upward next week —
 * and the excluded count is surfaced rather than hidden.
 */
function cohort(
  facts: OpportunityFact[],
  anchor: (f: OpportunityFact) => Date | null | undefined,
  window: PeriodRange,
  maturationDays: number
): { matured: OpportunityFact[]; pending: number } {
  const cutoff = window.end.getTime() - maturationDays * DAY_MS;
  const matured: OpportunityFact[] = [];
  let pending = 0;

  for (const fact of facts) {
    const at = anchor(fact) ?? null;
    if (!withinPeriod(at, window)) continue;
    // Opportunities with no pipeline have no milestone bars and can never
    // clear one — counting them would be a guaranteed conversion failure.
    if (fact.pipelineId == null) continue;
    if (at!.getTime() > cutoff) pending++;
    else matured.push(fact);
  }
  return { matured, pending };
}

function rate(
  matured: OpportunityFact[],
  pending: number,
  converted: (f: OpportunityFact) => boolean
): KpiValue {
  const denominator = matured.length;
  if (denominator === 0) {
    return { ...EMPTY, denominator: 0, pendingMaturation: pending };
  }
  const numerator = matured.filter(converted).length;
  return {
    value: (numerator / denominator) * 100,
    numerator,
    denominator,
    sampleSize: denominator,
    pendingMaturation: pending,
  };
}

/** Counts things that happened inside the window. */
function flowCount(
  facts: OpportunityFact[],
  anchor: (f: OpportunityFact) => Date | null | undefined,
  window: PeriodRange
): OpportunityFact[] {
  return facts.filter((f) => withinPeriod(anchor(f) ?? null, window));
}

function reached(milestone: FunnelStepKey) {
  return (f: OpportunityFact) => f.firstReachedAt[milestone] ?? null;
}

function totalSpendDollars(campaignRows: CampaignRow[]): number {
  return campaignRows.reduce((sum, c) => sum + (c.costCents ?? 0), 0) / 100;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Won deals whose close date falls inside the window, with a parsed fee. */
function closedWithRevenue(facts: OpportunityFact[], window: PeriodRange) {
  const closed = flowCount(facts, (f) => f.wonAt, window);
  const fees = closed.map((f) => f.revenue).filter((v): v is number => v !== null);
  return { closed, fees };
}

export type KpiCalculator = (
  facts: KpiFactTable,
  window: PeriodRange,
  ctx: ComputeContext
) => KpiValue;

export const KPI_CALCULATORS: Record<string, KpiCalculator> = {
  // ------------------------------------------------------ conversion (cohort)
  lead_to_appointment: (t, w, _c) => {
    const { matured, pending } = cohort(t.facts, (f) => f.createdAt, w, 14);
    return rate(matured, pending, (f) => f.firstReachedAt.appointments != null);
  },
  appointment_to_offer: (t, w) => {
    const { matured, pending } = cohort(t.facts, reached("appointments"), w, 14);
    return rate(matured, pending, (f) => f.firstReachedAt.offers != null);
  },
  offer_to_contract: (t, w) => {
    const { matured, pending } = cohort(t.facts, reached("offers"), w, 21);
    return rate(matured, pending, (f) => f.firstReachedAt.contracts != null);
  },
  contract_to_close: (t, w) => {
    const { matured, pending } = cohort(t.facts, reached("contracts"), w, 45);
    return rate(matured, pending, (f) => f.wonAt != null);
  },
  win_rate: (t, w) => {
    const { matured, pending } = cohort(t.facts, (f) => f.createdAt, w, 60);
    return rate(matured, pending, (f) => f.isWon);
  },
  fallout_rate: (t, w) => {
    const { matured, pending } = cohort(t.facts, reached("contracts"), w, 30);
    // Reached a contract, then died without ever being won.
    return rate(matured, pending, (f) => f.isLost && !f.isWon);
  },

  // ---------------------------------------------------------- revenue (flow)
  deals_closed: (t, w) => {
    const { closed } = closedWithRevenue(t.facts, w);
    return { ...EMPTY, value: closed.length, numerator: closed.length, sampleSize: closed.length };
  },
  gross_revenue: (t, w) => {
    const { closed, fees } = closedWithRevenue(t.facts, w);
    if (closed.length === 0) return { ...EMPTY, value: 0, sampleSize: 0 };
    return {
      ...EMPTY,
      value: fees.reduce((a, b) => a + b, 0),
      numerator: fees.length,
      sampleSize: closed.length,
    };
  },
  avg_assignment_fee: (t, w) => {
    const { fees } = closedWithRevenue(t.facts, w);
    return { ...EMPTY, value: mean(fees), denominator: fees.length, sampleSize: fees.length };
  },
  median_assignment_fee: (t, w) => {
    const { fees } = closedWithRevenue(t.facts, w);
    return { ...EMPTY, value: median(fees), denominator: fees.length, sampleSize: fees.length };
  },
  min_assignment_fee: (t, w) => {
    const { fees } = closedWithRevenue(t.facts, w);
    return {
      ...EMPTY,
      value: fees.length ? Math.min(...fees) : null,
      denominator: fees.length,
      sampleSize: fees.length,
    };
  },

  // ------------------------------------------------------------- marketing
  marketing_spend: (_t, _w, c) => {
    const spend = totalSpendDollars(c.campaigns);
    return { ...EMPTY, value: spend, sampleSize: c.campaigns.length };
  },
  reply_rate: (_t, _w, c) => {
    const replies = c.campaigns.reduce((s, x) => s + (x.replies ?? 0), 0);
    const delivered = c.campaigns.reduce((s, x) => s + (x.delivered ?? 0), 0);
    if (delivered === 0) return { ...EMPTY, denominator: 0 };
    return {
      ...EMPTY,
      value: (replies / delivered) * 100,
      numerator: replies,
      denominator: delivered,
      sampleSize: delivered,
    };
  },
  cost_per_contract: (t, w, c) => {
    const contracts = flowCount(t.facts, reached("contracts"), w).length;
    const spend = totalSpendDollars(c.campaigns);
    if (contracts === 0) return { ...EMPTY, denominator: 0 };
    return {
      ...EMPTY,
      value: spend / contracts,
      numerator: spend,
      denominator: contracts,
      sampleSize: contracts,
    };
  },
  cost_per_qualified_lead: (t, w, c) => {
    const qualified = flowCount(t.facts, reached("qualified"), w).length;
    const spend = totalSpendDollars(c.campaigns);
    if (qualified === 0) return { ...EMPTY, denominator: 0 };
    return {
      ...EMPTY,
      value: spend / qualified,
      numerator: spend,
      denominator: qualified,
      sampleSize: qualified,
    };
  },
  marketing_roi: (t, w, c) => {
    const { fees } = closedWithRevenue(t.facts, w);
    const revenue = fees.reduce((a, b) => a + b, 0);
    const spend = totalSpendDollars(c.campaigns);
    if (spend <= 0) return { ...EMPTY, denominator: 0 };
    return {
      ...EMPTY,
      value: ((revenue - spend) / spend) * 100,
      numerator: revenue - spend,
      denominator: spend,
      sampleSize: fees.length,
    };
  },
  fee_to_cost_ratio: (t, w, c) => {
    const { fees } = closedWithRevenue(t.facts, w);
    const revenue = fees.reduce((a, b) => a + b, 0);
    const spend = totalSpendDollars(c.campaigns);
    if (spend <= 0) return { ...EMPTY, denominator: 0 };
    return {
      ...EMPTY,
      value: revenue / spend,
      numerator: revenue,
      denominator: spend,
      sampleSize: fees.length,
    };
  },

  // -------------------------------------------------------------- velocity
  pipeline_velocity: (t, w) => {
    const contracted = flowCount(t.facts, reached("contracts"), w);
    const days = contracted
      .map((f) => {
        const at = f.firstReachedAt.contracts;
        if (!at || !f.createdAt) return null;
        return (at.getTime() - f.createdAt.getTime()) / DAY_MS;
      })
      .filter((v): v is number => v !== null);
    return { ...EMPTY, value: mean(days), denominator: days.length, sampleSize: days.length };
  },
  avg_days_in_stage: (_t, w, c) => {
    // Reuses the existing stage-duration primitive rather than reimplementing
    // it, so this agrees with the Pipeline tab.
    const inWindow = c.events.filter((e) => withinPeriod(e.occurredAt, w));
    const byStage = averageTimeInStageHours(inWindow);
    const hours = [...byStage.values()];
    const avg = mean(hours);
    return {
      ...EMPTY,
      value: avg === null ? null : avg / 24,
      denominator: hours.length,
      sampleSize: hours.length,
    };
  },
};

/** Computes one KPI, or an empty value when it has no calculator (blocked). */
export function computeKpiValue(
  definition: KpiDefinition,
  facts: KpiFactTable,
  window: PeriodRange,
  ctx: ComputeContext
): KpiValue {
  if (definition.blockedBy !== null) return EMPTY;
  const calculator = KPI_CALCULATORS[definition.id];
  if (!calculator) return EMPTY;
  return calculator(facts, window, ctx);
}

/**
 * Registry invariant, asserted at import time so a mismatch fails the build
 * rather than rendering a silently empty tile in production: every computable
 * KPI must have a calculator, and no blocked KPI may have one.
 */
export function assertCalculatorCoverage(definitions: KpiDefinition[]): void {
  const problems: string[] = [];
  for (const def of definitions) {
    const hasCalculator = Boolean(KPI_CALCULATORS[def.id]);
    if (def.blockedBy === null && !hasCalculator) {
      problems.push(`${def.id} is computable but has no calculator`);
    }
    if (def.blockedBy !== null && hasCalculator) {
      problems.push(`${def.id} is blocked but has a calculator`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`KPI registry/calculator mismatch:\n  ${problems.join("\n  ")}`);
  }
}
