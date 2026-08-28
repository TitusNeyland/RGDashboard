import type { KpiDefinition } from "@/lib/kpi/definitions";

/** The five statuses from spec §17. */
export type KpiStatus = "healthy" | "watch" | "weak" | "critical" | "insufficient_data";

export const KPI_STATUS_LABELS: Record<KpiStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  weak: "Weak",
  critical: "Critical",
  insufficient_data: "Insufficient data",
};

/**
 * How close to the warning threshold counts as "watch" — a KPI that has not
 * crossed the line but is within 10% of it.
 */
const WATCH_PROXIMITY = 0.1;

/**
 * Classifies a KPI value.
 *
 * Returns `null` for informational KPIs that carry no thresholds (revenue,
 * deal counts, spend). Those have no "good" value until RG sets targets, so
 * asserting health would be inventing a judgment — the UI shows the number
 * without a status chip instead.
 *
 * ORDER MATTERS. The sample-size gate runs BEFORE any threshold comparison,
 * because the spec's own example (§17) is Offer→Contract at 0% off 2 offers:
 * that is a sample too small to judge, not a business emergency, and must
 * never render CRITICAL.
 */
export function classifyKpi(
  value: number | null,
  sampleSize: number,
  definition: KpiDefinition
): KpiStatus | null {
  // A KPI with no data source can never be judged, regardless of thresholds.
  if (definition.blockedBy !== null) return "insufficient_data";

  if (value === null || Number.isNaN(value)) return "insufficient_data";

  // The sample gate — deliberately ahead of the threshold checks below.
  if (sampleSize < definition.minSampleSize) return "insufficient_data";

  const { warningThreshold, criticalThreshold, healthyDirection } = definition;
  if (warningThreshold === null && criticalThreshold === null) return null;

  const breached = (threshold: number | null) => {
    if (threshold === null) return false;
    return healthyDirection === "higher_is_better" ? value < threshold : value > threshold;
  };

  if (breached(criticalThreshold)) return "critical";
  if (breached(warningThreshold)) return "weak";

  // Not breached, but close enough to the warning line to be worth watching.
  if (warningThreshold !== null && warningThreshold !== 0) {
    const margin = Math.abs(warningThreshold) * WATCH_PROXIMITY;
    const approaching =
      healthyDirection === "higher_is_better"
        ? value < warningThreshold + margin
        : value > warningThreshold - margin;
    if (approaching) return "watch";
  }

  return "healthy";
}

/** Formats a computed value for display, per the KPI's declared format. */
export function formatKpiValue(value: number | null, definition: KpiDefinition): string {
  if (value === null || Number.isNaN(value)) return "—";

  switch (definition.format) {
    case "percent":
      return `${Math.round(value * 10) / 10}%`;
    case "currency":
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
    case "days": {
      const rounded = Math.round(value * 10) / 10;
      return `${rounded} ${rounded === 1 ? "day" : "days"}`;
    }
    case "ratio":
      return `${(Math.round(value * 100) / 100).toLocaleString("en-US")}×`;
    case "number":
    default:
      return value.toLocaleString("en-US");
  }
}
