import type { KpiFactTable } from "@/lib/kpi/facts";
import type { KpiSourceData } from "@/lib/kpi/facts";

/**
 * Data-quality scoring (spec §18).
 *
 * Every check declares which KPIs it undermines, so a quality problem can be
 * traced to the specific numbers it makes unreliable rather than producing an
 * unexplained overall grade.
 */
export interface DataConfidenceCheck {
  id: string;
  label: string;
  severity: "info" | "warn" | "severe";
  affectedCount: number;
  totalCount: number;
  affectedPct: number;
  /** Maximum points this check can remove from the score. */
  weight: number;
  pointsLost: number;
  impactedKpiIds: string[];
  detail: string;
  remedy: string;
}

export interface DataConfidenceReport {
  score: number;
  band: "high" | "medium" | "low";
  checks: DataConfidenceCheck[];
  /** KPI id -> the checks that materially undermine it. */
  impactByKpi: Map<string, DataConfidenceCheck[]>;
}

/** Share of affected rows at which a check costs its full weight. */
const FULL_PENALTY_AT = 0.3;

function makeCheck(
  base: Omit<DataConfidenceCheck, "affectedPct" | "pointsLost">
): DataConfidenceCheck {
  const affectedPct = base.totalCount === 0 ? 0 : base.affectedCount / base.totalCount;
  const pointsLost =
    Math.round(base.weight * Math.min(1, affectedPct / FULL_PENALTY_AT) * 10) / 10;
  return { ...base, affectedPct, pointsLost };
}

export function assessDataConfidence(
  data: KpiSourceData,
  facts: KpiFactTable
): DataConfidenceReport {
  const total = facts.facts.length;
  const checks: DataConfidenceCheck[] = [];

  const missingSource = facts.facts.filter((f) => !f.source || f.source.trim() === "").length;
  checks.push(
    makeCheck({
      id: "missing_source",
      label: "Leads with no marketing source",
      severity: "severe",
      affectedCount: missingSource,
      totalCount: total,
      weight: 15,
      impactedKpiIds: ["marketing_roi", "cost_per_contract", "cost_per_qualified_lead", "fee_to_cost_ratio"],
      detail: "Without a source, a lead cannot be attributed to the campaign that produced it.",
      remedy: "Stamp a consistent lead source in GHL at send time; see lib/campaigns/attribution.ts.",
    })
  );

  const missingOwner = facts.facts.filter((f) => f.ownerGhlId == null).length;
  checks.push(
    makeCheck({
      id: "missing_owner",
      label: "Leads with no assigned owner",
      severity: "warn",
      affectedCount: missingOwner,
      totalCount: total,
      weight: 10,
      impactedKpiIds: [],
      detail: "Unowned leads cannot be attributed to an employee.",
      remedy: "Ensure GHL assigns an owner on lead creation.",
    })
  );

  const contractNoOffer = facts.facts.filter(
    (f) => f.firstReachedAt.contracts != null && f.firstReachedAt.offers == null
  ).length;
  checks.push(
    makeCheck({
      id: "contract_without_offer",
      label: "Contracts with no recorded offer",
      severity: "severe",
      affectedCount: contractNoOffer,
      totalCount: total,
      weight: 15,
      impactedKpiIds: ["offer_to_contract", "appointment_to_offer"],
      detail: "A contract with no preceding offer breaks the offer-to-contract denominator.",
      remedy: "Confirm the pipeline has an offer stage and that leads pass through it.",
    })
  );

  const noEvents = facts.facts.filter((f) => f.eventCount === 0).length;
  checks.push(
    makeCheck({
      id: "no_event_history",
      label: "Leads with no recorded stage history",
      severity: "severe",
      affectedCount: noEvents,
      totalCount: total,
      weight: 15,
      impactedKpiIds: [
        "lead_to_appointment",
        "appointment_to_offer",
        "offer_to_contract",
        "contract_to_close",
        "pipeline_velocity",
      ],
      detail:
        "These leads progressed before event tracking began, so no milestone can be dated. They sit in cohort denominators without ever appearing in a numerator.",
      remedy: "Unavoidable for history predating the first sync; resolves as new history accumulates.",
    })
  );

  const milestoneNoEvent = facts.facts.filter((f) => f.milestonesWithoutEvent.length > 0).length;
  checks.push(
    makeCheck({
      id: "milestone_without_event",
      label: "Milestones reached with no dating event",
      severity: "severe",
      affectedCount: milestoneNoEvent,
      totalCount: total,
      weight: 15,
      impactedKpiIds: ["lead_to_appointment", "offer_to_contract", "pipeline_velocity"],
      detail:
        "The lead's current stage clears a milestone, but no event explains when it happened, so it cannot be placed in a period.",
      remedy: "Resolves as event history accumulates past the first sync.",
    })
  );

  const wonNoRevenue = facts.facts.filter((f) => f.isWon && f.revenue == null).length;
  const wonTotal = facts.facts.filter((f) => f.isWon).length;
  checks.push(
    makeCheck({
      id: "won_without_revenue",
      label: "Won deals with no assignment fee",
      severity: "warn",
      affectedCount: wonNoRevenue,
      totalCount: wonTotal,
      weight: 5,
      impactedKpiIds: ["gross_revenue", "avg_assignment_fee", "marketing_roi"],
      detail: "A won deal with no fee understates revenue.",
      remedy: "Populate monetary value on won opportunities in GHL.",
    })
  );

  // Duplicate open opportunities on one contact — same signal the existing
  // duplicate-opportunity lead rule flags.
  const openByContact = new Map<string, number>();
  for (const f of facts.facts) {
    if (f.isWon || f.isLost || !f.contactGhlId) continue;
    openByContact.set(f.contactGhlId, (openByContact.get(f.contactGhlId) ?? 0) + 1);
  }
  const duplicates = [...openByContact.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0);
  checks.push(
    makeCheck({
      id: "duplicate_leads",
      label: "Duplicate open opportunities",
      severity: "warn",
      affectedCount: duplicates,
      totalCount: total,
      weight: 10,
      impactedKpiIds: ["lead_to_appointment", "win_rate"],
      detail: "One seller counted more than once inflates lead volume and dilutes conversion rates.",
      remedy: "Merge duplicates in GHL; the Needs Attention tab lists them.",
    })
  );

  const knownStageIds = new Set(data.stages.map((s) => s.stageId));
  const orphaned = facts.facts.filter(
    (f) => f.pipelineId == null || (f.contactGhlId == null)
  ).length;
  const orphanEvents = data.events.filter(
    (e) => e.toStageId != null && !knownStageIds.has(e.toStageId)
  ).length;
  checks.push(
    makeCheck({
      id: "orphaned_records",
      label: "Orphaned opportunities and events",
      severity: "severe",
      affectedCount: orphaned + orphanEvents,
      totalCount: total + data.events.length,
      weight: 15,
      impactedKpiIds: [],
      detail:
        "Opportunities with no pipeline or contact, or events pointing at stages that no longer exist. These are excluded from cohort denominators entirely.",
      remedy: "Re-run npm run sync; if it persists, the stage was deleted in GHL.",
    })
  );

  if (facts.untracked.length > 0) {
    checks.push(
      makeCheck({
        id: "untracked_milestones",
        label: "Funnel milestones with no matching stage",
        severity: "info",
        affectedCount: facts.untracked.length,
        totalCount: facts.untracked.length,
        weight: 5,
        impactedKpiIds: [],
        detail: `No pipeline stage matches: ${facts.untracked.join(", ")}. These report as not tracked, never zero.`,
        remedy: "Add a matching stage in GHL, or accept that the milestone is unmeasurable.",
      })
    );
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - checks.reduce((sum, c) => sum + c.pointsLost, 0)))
  );

  const impactByKpi = new Map<string, DataConfidenceCheck[]>();
  for (const check of checks) {
    // Only a materially affected check counts against a specific KPI.
    if (check.severity !== "severe" || check.affectedPct <= 0.2) continue;
    for (const kpiId of check.impactedKpiIds) {
      const list = impactByKpi.get(kpiId) ?? [];
      list.push(check);
      impactByKpi.set(kpiId, list);
    }
  }

  return {
    score,
    band: score >= 85 ? "high" : score >= 60 ? "medium" : "low",
    checks,
    impactByKpi,
  };
}
