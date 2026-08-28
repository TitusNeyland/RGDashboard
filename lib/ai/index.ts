import { openAiProvider } from "@/lib/ai/openai-provider";
import { placeholderProvider } from "@/lib/ai/placeholder-provider";
import type { AiProvider } from "@/lib/ai/types";

/**
 * Placeholder unless explicitly switched on. Opting in takes both a
 * provider choice and a key, so a stray OPENAI_API_KEY in the environment
 * can't silently start billing against every page view.
 */
export function getAiProvider(): AiProvider {
  const configured = (process.env.AI_PROVIDER ?? "placeholder").toLowerCase();
  if (configured === "openai" && process.env.OPENAI_API_KEY) return openAiProvider;
  return placeholderProvider;
}

export * from "@/lib/ai/types";
