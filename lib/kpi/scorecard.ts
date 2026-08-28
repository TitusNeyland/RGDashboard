import { KPI_DEFINITIONS, type KpiDefinition } from "@/lib/kpi/definitions";
import { buildKpiFacts, type KpiSourceData } from "@/lib/kpi/facts";
import { computeKpiValue, assertCalculatorCoverage, type ComputeContext } from "@/lib/kpi/compute";
import { assessDataConfidence, type DataConfidenceCheck } from "@/lib/kpi/data-confidence";
import { PERIOD_ORDER, resolvePeriod, previousComparable, type PeriodKey, type PeriodRange } from "@/lib/kpi/periods";
import { classifyKpi, formatKpiValue, type KpiStatus } from "@/lib/kpi/status";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One KPI, evaluated for one window. Every field is JSON-serializable: this
 * crosses the server/client boundary to the period switcher, and under static
 * export it is baked into the HTML.
 */
export interface KpiResult {
  kpiId: string;
  value: number | null;
  formatted: string;
  numerator: number | null;
  denominator: number | null;
  sampleSize: number;
  pendingMaturation: number;
  /** Null means informational — a KPI with no thresholds to judge against. */
  status: KpiStatus | null;
  statusReason: string;
  previousValue: number | null;
  changePct: number | null;
  /** Whether the change moved in the KPI's healthy direction. */
  isImprovement: boolean | null;
  baseline4wValue: number | null;
  baseline90dValue: number | null;
  varianceVsBaselinePct: number | null;
  /** Set when data quality forced the status down; names what caused it. */
  downgradedFrom: KpiStatus | null;
  downgradeReason: string | null;
}

export interface ScorecardPayload {
  generatedAtIso: string;
  usingMockData: boolean;
  observabilityStartIso: string | null;
  periods: { key: PeriodKey; label: string; startIso: string; endIso: string }[];
  resultsByPeriod: Record<string, KpiResult[]>;
  confidence: {
    score: number;
    band: "high" | "medium" | "low";
    checks: DataConfidenceCheck[];
  };
}

/** A trailing window of `days` ending where `window` begins. */
function trailingBefore(window: PeriodRange, days: number): PeriodRange {
  const end = new Date(window.start.getTime() - 1);
  return {
    key: window.key,
    label: `Trailing ${days}d`,
    start: new Date(end.getTime() - days * DAY_MS),
    end,
  };
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Evaluates one KPI for one window, applying the gates in a fixed order.
 *
 * Order is load-bearing. The sample-size gate must precede any threshold
 * comparison, and the observability gate must precede both — otherwise a
 * window predating the event log reads as a conversion collapse rather than
 * as history we never recorded.
 */
function evaluate(
  definition: KpiDefinition,
  window: PeriodRange,
  facts: ReturnType<typeof buildKpiFacts>,
  ctx: ComputeContext,
  confidenceImpact: Map<string, DataConfidenceCheck[]>
): KpiResult {
  const current = computeKpiValue(definition, facts, window, ctx);

  const base = {
    kpiId: definition.id,
    value: current.value,
    formatted: formatKpiValue(current.value, definition),
    numerator: current.numerator,
    denominator: current.denominator,
    sampleSize: current.sampleSize,
    pendingMaturation: current.pendingMaturation,
    previousValue: null as number | null,
    changePct: null as number | null,
    isImprovement: null as boolean | null,
    baseline4wValue: null as number | null,
    baseline90dValue: null as number | null,
    varianceVsBaselinePct: null as number | null,
    downgradedFrom: null as KpiStatus | null,
    downgradeReason: null as string | null,
  };

  // Gate 1 — no data source at all.
  if (definition.blockedBy !== null) {
    return { ...base, status: "insufficient_data", statusReason: definition.blockedBy };
  }

  // Gate 2 — the window predates our event history. Only cohort KPIs depend
  // on dated milestones, so only they are affected.
  if (
    definition.windowMode === "cohort" &&
    facts.observabilityStart !== null &&
    window.start < facts.observabilityStart
  ) {
    return {
      ...base,
      status: "insufficient_data",
      statusReason: `Stage history only begins ${facts.observabilityStart.toISOString().slice(0, 10)}; this window starts earlier, so leads that converted before then cannot be counted.`,
    };
  }

  // Gate 2b — the funnel has no stage representing a milestone this KPI
  // depends on. Distinct from "no records": the milestone is unmeasurable,
  // not empty.
  if (definition.requiresMilestone && facts.untracked.includes(definition.requiresMilestone)) {
    return {
      ...base,
      status: "insufficient_data",
      statusReason: `No stage in ${facts.pipelineName} represents "${definition.requiresMilestone}", so this cannot be measured. Add a matching stage in GHL, or accept the milestone is untracked.`,
    };
  }

  // Gate 3 — nothing to divide.
  if (current.value === null) {
    const reason =
      current.pendingMaturation > 0
        ? `No matured cohort yet — ${current.pendingMaturation} lead${current.pendingMaturation === 1 ? " in this window is" : "s in this window are"} still too new to score (needs ${definition.maturationDays} days).`
        : "No qualifying records in this window.";
    return { ...base, status: "insufficient_data", statusReason: reason };
  }

  // Gate 4 — sample too small to judge. Precedes thresholds deliberately.
  if (current.sampleSize < definition.minSampleSize) {
    return {
      ...base,
      status: "insufficient_data",
      statusReason: `Sample of ${current.sampleSize} is below the minimum of ${definition.minSampleSize} needed to judge this reliably.`,
    };
  }

  // Comparisons — computed from unrounded values.
  const prevWindow = previousComparable(window);
  const previous = computeKpiValue(definition, facts, prevWindow, ctx);
  const b4w = computeKpiValue(definition, facts, trailingBefore(window, 28), ctx);
  const b90d = computeKpiValue(definition, facts, trailingBefore(window, 90), ctx);

  const changePct = pctChange(current.value, previous.value);
  const isImprovement =
    changePct === null
      ? null
      : definition.healthyDirection === "higher_is_better"
        ? changePct > 0
        : changePct < 0;

  let status = classifyKpi(current.value, current.sampleSize, definition);
  let statusReason =
    status === null
      ? "Informational — no target is set for this metric yet."
      : `${formatKpiValue(current.value, definition)} on a sample of ${current.sampleSize}.`;

  // Gate 5 — data quality may only make a KPI look LESS certain. It can never
  // promote to healthy, and never pushes to weak or critical: a sync problem
  // is not a business problem, and conflating the two gets someone blamed for
  // a data bug.
  let downgradedFrom: KpiStatus | null = null;
  let downgradeReason: string | null = null;
  const impacting = confidenceImpact.get(definition.id) ?? [];
  if (impacting.length > 0 && status !== null && status !== "insufficient_data") {
    const worst = impacting.reduce((a, b) => (a.affectedPct >= b.affectedPct ? a : b));
    const pct = Math.round(worst.affectedPct * 100);
    if (worst.affectedPct > 0.5) {
      downgradedFrom = status;
      status = "insufficient_data";
      downgradeReason = `${pct}% of records are affected by "${worst.label}", too many to trust this figure.`;
      statusReason = downgradeReason;
    } else if (status === "healthy") {
      downgradedFrom = status;
      status = "watch";
      downgradeReason = `Would read healthy, but ${pct}% of records are affected by "${worst.label}".`;
      statusReason = downgradeReason;
    }
  }

  return {
    ...base,
    status,
    statusReason,
    previousValue: previous.value,
    changePct,
    isImprovement,
    baseline4wValue: b4w.value,
    baseline90dValue: b90d.value,
    varianceVsBaselinePct: pctChange(current.value, b4w.value),
    downgradedFrom,
    downgradeReason,
  };
}

/**
 * Computes every KPI for every period.
 *
 * All periods are computed server-side because the client period switcher
 * cannot fetch — there is no API route under static export. The payload is
 * ids and numbers only; names, formulas and explanations are imported
 * directly from the registry by the components that render them.
 */
export function buildScorecard(
  data: KpiSourceData & { usingMockData: boolean },
  asOf: Date
): ScorecardPayload {
  assertCalculatorCoverage(KPI_DEFINITIONS);

  const facts = buildKpiFacts(data, asOf);
  const confidence = assessDataConfidence(data, facts);
  const ctx: ComputeContext = { events: data.events, campaigns: data.campaigns, asOf };

  const periods = PERIOD_ORDER.map((key) => resolvePeriod(key, asOf));
  const resultsByPeriod: Record<string, KpiResult[]> = {};
  for (const window of periods) {
    resultsByPeriod[window.key] = KPI_DEFINITIONS.map((definition) =>
      evaluate(definition, window, facts, ctx, confidence.impactByKpi)
    );
  }

  return {
    generatedAtIso: asOf.toISOString(),
    usingMockData: data.usingMockData,
    observabilityStartIso: facts.observabilityStart?.toISOString() ?? null,
    periods: periods.map((p) => ({
      key: p.key,
      label: p.label,
      startIso: p.start.toISOString(),
      endIso: p.end.toISOString(),
    })),
    resultsByPeriod,
    confidence: {
      score: confidence.score,
      band: confidence.band,
      checks: confidence.checks,
    },
  };
}
