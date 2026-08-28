/**
 * The AI layer's contract.
 *
 * Scope rule from the spec, enforced by this file's shape: AI is used ONLY
 * where judgment is needed. Anything derivable by arithmetic — time since
 * contact, stage duration, missing fields, campaign status — is computed in
 * plain code (lib/rules/lead-rules.ts, lib/pipeline-dashboard.ts) and passed
 * to the model as context. The model never counts, dates, or totals; it
 * reads conversation text and forms an opinion.
 */

export type MotivationLevel = "high" | "medium" | "low" | "unknown";

export type FollowUpCategory =
  | "call_now"
  | "nurture_long_term"
  | "send_offer"
  | "needs_more_info"
  | "close_out";

export const FOLLOW_UP_LABELS: Record<FollowUpCategory, string> = {
  call_now: "Call now",
  nurture_long_term: "Nurture long-term",
  send_offer: "Send offer",
  needs_more_info: "Needs more info",
  close_out: "Close out",
};

export interface LeadInsight {
  /** 2-3 sentence recap of where the conversation stands. */
  summary: string;
  motivation: {
    level: MotivationLevel;
    /** Short quotes or paraphrases that justify the level. */
    signals: string[];
  };
  priceObjection: {
    detected: boolean;
    detail: string | null;
  };
  stillInterested: {
    verdict: "yes" | "no" | "unclear";
    reason: string;
  };
  recommendedFollowUp: {
    category: FollowUpCategory;
    reason: string;
  };
}

export interface AcquisitionBrief {
  headline: string;
  sellerSituation: string;
  propertyNotes: string;
  risks: string[];
  suggestedNextStep: string;
}

/**
 * Everything the model is given. Deterministic fields are computed by code
 * so the model is never asked to do arithmetic it would get wrong.
 */
export interface LeadContext {
  leadName: string;
  stageName: string | null;
  pipelineName: string | null;
  status: string | null;
  ownerName: string | null;
  source: string | null;
  monetaryValue: string | null;
  /** Computed in code, not by the model. */
  facts: {
    daysSinceLastUpdate: number | null;
    daysInCurrentStage: number | null;
    stageHistory: { stage: string; enteredAt: Date }[];
    openFlags: { what: string; priority: string }[];
  };
  /**
   * Seller messages. EMPTY until GHL conversations are synced — see
   * `conversationsAvailable`. Without these, every judgment field is
   * unsupported and the provider must say so rather than invent one.
   */
  conversation: { from: "seller" | "rep"; text: string; sentAt: Date }[];
  conversationsAvailable: boolean;
}

/** Result envelope so the UI can always tell where an answer came from. */
export interface AiResult<T> {
  data: T;
  provider: "placeholder" | "openai";
  /** True when returned without a real model call. */
  isPlaceholder: boolean;
  /** Why the answer is limited, if it is. */
  caveat: string | null;
}

export interface AiProvider {
  readonly name: "placeholder" | "openai";
  generateLeadInsight(context: LeadContext): Promise<AiResult<LeadInsight>>;
  generateAcquisitionBrief(context: LeadContext): Promise<AiResult<AcquisitionBrief>>;
}
