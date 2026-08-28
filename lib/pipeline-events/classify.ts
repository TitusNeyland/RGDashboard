export type PipelineEventType =
  | "stage_change"
  | "offer"
  | "contract"
  | "lost"
  | "reactivation";

const OFFER_KEYWORDS = ["offer"];
const CONTRACT_KEYWORDS = ["contract", "closing", "closed won", "won"];
const LOST_KEYWORDS = ["lost", "dead", "abandon"];

/**
 * Labels a stage-change event from stage/status names alone — the doc asks
 * to track "offers," "contracts," "lost leads," and "reactivations" as
 * first-class events, but nothing syncs those as separate GHL objects yet.
 * This infers them from keywords in the stage RG moved the lead *to*, so
 * accuracy depends entirely on RG's real stage names (unknown until the
 * Phase 0 discovery pass) — treat this as a heuristic to tighten once real
 * pipeline stage names are known, not a source of truth.
 */
export function classifyStageEvent(params: {
  fromStageName: string | null;
  fromStatus: string | null;
  toStageName: string | null;
  toStatus: string | null;
}): PipelineEventType {
  const to = (params.toStageName ?? "").toLowerCase();
  const toStatus = (params.toStatus ?? "").toLowerCase();
  const fromStatus = (params.fromStatus ?? "").toLowerCase();
  const from = (params.fromStageName ?? "").toLowerCase();

  const wasLost =
    LOST_KEYWORDS.some((k) => from.includes(k)) ||
    fromStatus === "lost" ||
    fromStatus === "abandoned";
  const isNowActive = toStatus === "open" || (!toStatus && !LOST_KEYWORDS.some((k) => to.includes(k)));
  if (wasLost && isNowActive) return "reactivation";

  if (toStatus === "lost" || toStatus === "abandoned" || LOST_KEYWORDS.some((k) => to.includes(k))) {
    return "lost";
  }
  if (CONTRACT_KEYWORDS.some((k) => to.includes(k))) return "contract";
  if (OFFER_KEYWORDS.some((k) => to.includes(k))) return "offer";
  return "stage_change";
}
