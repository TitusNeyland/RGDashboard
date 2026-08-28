import type { LeadContext } from "@/lib/ai/types";

/**
 * Real prompts, written to be usable the moment a key is wired up.
 *
 * Two rules they enforce:
 *   1. The model is told the deterministic facts rather than asked to
 *      derive them, so it never miscounts days or stages.
 *   2. It must answer "unknown" instead of guessing. A confident invented
 *      motivation read is worse than an admitted gap, because someone will
 *      act on it.
 */
export const LEAD_INSIGHT_SYSTEM_PROMPT = `You analyze seller conversations for a real estate investment company (RG Investment Group).

You are given a lead's pipeline facts and, when available, the message history between the seller and a rep.

Rules:
- Judge only what the conversation supports. If there is no conversation, set motivation.level to "unknown", stillInterested.verdict to "unclear", priceObjection.detected to false, and say plainly in each reason field that there is no conversation to read. Never infer motivation from pipeline stage alone.
- Do not restate or recompute the numeric facts you are given. They are already correct.
- Quote or closely paraphrase the seller for every signal you list. No signal without evidence.
- Be concise and concrete. A rep reads this between calls.

Respond with JSON only, matching this shape:
{
  "summary": string,
  "motivation": { "level": "high" | "medium" | "low" | "unknown", "signals": string[] },
  "priceObjection": { "detected": boolean, "detail": string | null },
  "stillInterested": { "verdict": "yes" | "no" | "unclear", "reason": string },
  "recommendedFollowUp": {
    "category": "call_now" | "nurture_long_term" | "send_offer" | "needs_more_info" | "close_out",
    "reason": string
  }
}`;

export const ACQUISITION_BRIEF_SYSTEM_PROMPT = `You write short acquisition briefs for a real estate investment company (RG Investment Group).

A brief prepares an acquisitions rep to walk into a conversation. It is not a summary of the CRM record — the rep can already see that.

Rules:
- Lead with what matters about the seller's situation and motivation.
- List risks honestly, including "seller motivation is unverified" when there is no conversation history to read.
- Do not invent property details, financials, or seller statements. If you do not know, say so.
- Suggest one concrete next step.

Respond with JSON only, matching this shape:
{
  "headline": string,
  "sellerSituation": string,
  "propertyNotes": string,
  "risks": string[],
  "suggestedNextStep": string
}`;

/** Serializes context into the user message. */
export function buildContextMessage(context: LeadContext): string {
  const f = context.facts;
  const lines = [
    `Lead: ${context.leadName}`,
    `Pipeline: ${context.pipelineName ?? "unknown"}`,
    `Stage: ${context.stageName ?? "unknown"} (status: ${context.status ?? "unknown"})`,
    `Owner: ${context.ownerName ?? "unassigned"}`,
    `Lead source: ${context.source ?? "unknown"}`,
    `Estimated value: ${context.monetaryValue ?? "unknown"}`,
    "",
    "Facts already computed — treat as correct, do not recalculate:",
    `- Days since last CRM update: ${f.daysSinceLastUpdate ?? "unknown"}`,
    `- Days in current stage: ${f.daysInCurrentStage ?? "unknown"}`,
  ];

  if (f.stageHistory.length > 0) {
    lines.push("- Stage history:");
    for (const s of f.stageHistory) {
      lines.push(`  - ${s.stage} on ${s.enteredAt.toISOString().slice(0, 10)}`);
    }
  } else {
    lines.push("- Stage history: none recorded");
  }

  if (f.openFlags.length > 0) {
    lines.push("- Open issues flagged by the rules engine:");
    for (const flag of f.openFlags) lines.push(`  - [${flag.priority}] ${flag.what}`);
  }

  lines.push("");
  if (!context.conversationsAvailable) {
    lines.push(
      "CONVERSATION HISTORY: not available. This deployment does not sync GHL conversations yet, so no seller messages exist to analyze. Follow the rule for missing conversations."
    );
  } else if (context.conversation.length === 0) {
    lines.push("CONVERSATION HISTORY: synced, but this lead has no messages.");
  } else {
    lines.push("CONVERSATION HISTORY (oldest first):");
    for (const m of context.conversation) {
      lines.push(`[${m.sentAt.toISOString().slice(0, 16)}] ${m.from}: ${m.text}`);
    }
  }

  return lines.join("\n");
}
