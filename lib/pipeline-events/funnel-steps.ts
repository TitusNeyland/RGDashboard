/**
 * The canonical funnel milestones RG's spec asks to report on, and the
 * stage-name keywords used to recognize each one.
 *
 * Everything downstream (the weekly rollup, campaign outcome counts) reads
 * milestones from here rather than keeping its own keyword list, so there
 * is exactly one place to correct once RG's real GHL stage names are known
 * from the Phase 0 discovery pass. Until then this is a heuristic: a stage
 * only counts toward a milestone if its *name* contains one of these words.
 */
export const FUNNEL_STEPS = [
  { key: "interested", label: "Interested", keywords: ["interested", "warm"] },
  { key: "qualified", label: "Qualified", keywords: ["qualified"] },
  { key: "appointments", label: "Appointments", keywords: ["appointment", "appt"] },
  { key: "visits", label: "Visits", keywords: ["visit"] },
  { key: "offers", label: "Offers", keywords: ["offer"] },
  { key: "contracts", label: "Contracts", keywords: ["contract"] },
  { key: "closings", label: "Closings", keywords: ["closing", "closed won", "funded"] },
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEPS)[number]["key"];

export function funnelStep(key: FunnelStepKey) {
  const step = FUNNEL_STEPS.find((s) => s.key === key);
  if (!step) throw new Error(`Unknown funnel step: ${key}`);
  return step;
}

/** True when a stage name reads as the given milestone. */
export function stageMatchesStep(stageName: string | null, key: FunnelStepKey) {
  if (!stageName) return false;
  const name = stageName.toLowerCase();
  return funnelStep(key).keywords.some((k) => name.includes(k));
}
