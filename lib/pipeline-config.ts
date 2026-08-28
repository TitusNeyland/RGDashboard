import type { FunnelStepKey } from "@/lib/pipeline-events/funnel-steps";

/**
 * RG's real pipeline configuration, read off the live GHL account via
 * `npm run discover` on 2026-08-28.
 *
 * WHY THIS FILE EXISTS: milestones were previously inferred from stage-name
 * keywords, which is guesswork. Against RG's actual stages that guesswork was
 * wrong in four separate ways — it missed every win stage (all three deal
 * funnels end in a stage named "closed", which matched none of the closing
 * keywords), counted "Not interested" as Interested and "Not qualified" as
 * Qualified, and treated "Not a Fit" as still live. Explicit stage IDs remove
 * the guessing entirely for the pipeline that matters.
 *
 * Stage IDs are used rather than names because names get edited in GHL; the
 * names in the comments are for humans and may drift.
 */

/**
 * THE RG WAY — the acquisition funnel, confirmed by RG as the only pipeline
 * whose stages represent seller-deal progression.
 *
 * The location has 12 pipelines, and most are not deal funnels at all:
 * "RG Way Apprenticeship" tracks employee onboarding, "Partner Applications"
 * tracks partner recruiting, "Lead score" and the nurture pipelines are
 * status buckets. Counting those as leads would put apprentices and partners
 * in the conversion denominators.
 */
export const ACQUISITION_PIPELINE_ID = "VwDHYOpeE22Qq3SBd9Fj";
export const ACQUISITION_PIPELINE_NAME = "THE RG WAY";

/**
 * The first stage that satisfies each milestone. A lead counts as having
 * reached a milestone once it reaches this stage or any later progress stage.
 *
 * Not mapped, deliberately:
 * - `interested` and `qualified` — THE RG WAY has no stage representing
 *   either. They report as untracked rather than zero.
 */
export const MILESTONE_STAGE_IDS: Partial<Record<FunnelStepKey, string>> = {
  // APPOINTMENT SET — RG has agreed with the seller to go to the property.
  appointments: "b940d2af-4cf4-494c-a507-a035c7e83caa",
  // Appointment completed — RG went to the property and a visit form was
  // filled out. This is the visit, and also the held appointment.
  visits: "0aeb11dd-0923-4e14-b15b-0430c2d76a03",
  // Offer Sent/ Negotiating
  offers: "42f0caff-969f-40e0-99b8-5ef839e03812",
  // Under contract
  contracts: "60ed85ef-5e19-49e0-a6ea-0884fe35abb8",
  // closed
  closings: "3f154b00-0c74-4de6-ab65-79d665068e32",
};

/**
 * Stages that do NOT represent forward progress, and must be excluded when
 * computing how far a lead advanced.
 *
 * This is not only about lost deals. In THE RG WAY, "Needs Follow up" sits at
 * position 9 — AFTER "closed" at position 8 — so a lead parked there would
 * otherwise clear every milestone bar beneath it and be counted as a closed
 * deal. Stage position reflects display order, not funnel progression.
 */
export const NON_PROGRESS_STAGE_IDS = new Set<string>([
  "739c42be-e3a0-4b25-a70d-9c570ac49a5c", // Needs Follow up — a holding state
  "392b72de-334e-4394-a8ca-2da2b16102a6", // Lost — terminal
]);

/** Stages that mean the deal died. A subset of the above. */
export const LOST_STAGE_IDS = new Set<string>([
  "392b72de-334e-4394-a8ca-2da2b16102a6", // Lost
]);

/** True when this stage should be skipped when advancing the milestone ladder. */
export function isNonProgressStageId(stageId: string | null | undefined): boolean {
  return stageId != null && NON_PROGRESS_STAGE_IDS.has(stageId);
}

/** True when the opportunity belongs to the configured acquisition funnel. */
export function isAcquisitionPipeline(pipelineId: string | null | undefined): boolean {
  return pipelineId === ACQUISITION_PIPELINE_ID;
}

/**
 * Whether the explicit map covers this pipeline. When it does, stage IDs are
 * authoritative and keyword matching is not consulted at all.
 */
export function hasExplicitConfig(pipelineId: string | null | undefined): boolean {
  return pipelineId === ACQUISITION_PIPELINE_ID;
}
