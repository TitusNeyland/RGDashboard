import {
  ACQUISITION_BRIEF_SYSTEM_PROMPT,
  buildContextMessage,
  LEAD_INSIGHT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type {
  AcquisitionBrief,
  AiProvider,
  AiResult,
  LeadContext,
  LeadInsight,
} from "@/lib/ai/types";

/**
 * Real OpenAI implementation — written and ready, but NOT ACTIVE and NOT
 * YET VERIFIED against the live API. `getAiProvider()` returns the
 * placeholder unless AI_PROVIDER=openai is set explicitly.
 *
 * Before trusting it: set AI_PROVIDER=openai and OPENAI_API_KEY, open one
 * lead, and check the response parses. Confirm OPENAI_MODEL names a model
 * your account can actually use — the default below is a guess at a
 * sensible cheap model, not a checked fact.
 *
 * Uses fetch directly rather than the SDK so the app takes no new
 * dependency until the layer is actually switched on.
 */
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function complete<T>(
  systemPrompt: string,
  context: LeadContext
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      // Low temperature: this is an extraction task, not a creative one.
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildContextMessage(context) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${res.status} ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`OpenAI returned unparseable JSON: ${content.slice(0, 300)}`);
  }
}

export const openAiProvider: AiProvider = {
  name: "openai",

  async generateLeadInsight(context: LeadContext): Promise<AiResult<LeadInsight>> {
    const data = await complete<LeadInsight>(LEAD_INSIGHT_SYSTEM_PROMPT, context);
    return {
      data,
      provider: "openai",
      isPlaceholder: false,
      caveat: context.conversationsAvailable
        ? null
        : "No conversation history was available, so judgment fields are unsupported.",
    };
  },

  async generateAcquisitionBrief(context: LeadContext): Promise<AiResult<AcquisitionBrief>> {
    const data = await complete<AcquisitionBrief>(ACQUISITION_BRIEF_SYSTEM_PROMPT, context);
    return {
      data,
      provider: "openai",
      isPlaceholder: false,
      caveat: context.conversationsAvailable
        ? null
        : "No conversation history was available, so the brief is based on pipeline data alone.",
    };
  },
};
