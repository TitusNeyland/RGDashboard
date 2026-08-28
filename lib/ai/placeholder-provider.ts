import type {
  AcquisitionBrief,
  AiProvider,
  AiResult,
  LeadContext,
  LeadInsight,
} from "@/lib/ai/types";

const NO_CONVERSATIONS =
  "Placeholder output — no model was called. GHL conversations are not synced, so there is nothing to analyze even with a key configured.";

const NO_KEY =
  "Placeholder output — no model was called. Set AI_PROVIDER=openai and OPENAI_API_KEY to enable real analysis.";

/**
 * The default provider. Returns clearly-labeled placeholders instead of
 * plausible-looking analysis.
 *
 * This is deliberate: fabricated motivation reads and invented seller
 * quotes are indistinguishable from real ones once they are on screen, and
 * a rep would act on them. Every field here announces itself as a
 * placeholder so nothing can be mistaken for a judgment the app actually
 * made.
 */
export const placeholderProvider: AiProvider = {
  name: "placeholder",

  async generateLeadInsight(context: LeadContext): Promise<AiResult<LeadInsight>> {
    const caveat = context.conversationsAvailable ? NO_KEY : NO_CONVERSATIONS;

    return {
      provider: "placeholder",
      isPlaceholder: true,
      caveat,
      data: {
        summary:
          `Placeholder summary for ${context.leadName}. With a model connected, this would recap ` +
          `the seller conversation in two or three sentences.`,
        motivation: {
          level: "unknown",
          signals: [],
        },
        priceObjection: {
          detected: false,
          detail: null,
        },
        stillInterested: {
          verdict: "unclear",
          reason: "No conversation has been analyzed.",
        },
        recommendedFollowUp: {
          category: "needs_more_info",
          reason: "No conversation has been analyzed.",
        },
      },
    };
  },

  async generateAcquisitionBrief(context: LeadContext): Promise<AiResult<AcquisitionBrief>> {
    const caveat = context.conversationsAvailable ? NO_KEY : NO_CONVERSATIONS;

    return {
      provider: "placeholder",
      isPlaceholder: true,
      caveat,
      data: {
        headline: `Placeholder brief for ${context.leadName}`,
        sellerSituation:
          "With a model connected, this would describe the seller's situation and motivation, drawn from their messages.",
        propertyNotes:
          "Property details are not synced from PropertyReach yet, so a real brief would note them as unknown.",
        risks: ["Seller motivation is unverified — no conversation history has been analyzed."],
        suggestedNextStep: "Review the lead in GHL directly until the AI layer is connected.",
      },
    };
  },
};
