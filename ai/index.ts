import { GeminiProvider } from "@/ai/gemini-provider";
import { MockProvider } from "@/ai/mock-provider";
import { GroqProvider } from "@/ai/groq-provider";
import type { AIProvider } from "@/ai/provider";
import { AIProviderError } from "@/ai/errors";
import { appConfig } from "@/lib/config";

export function getAIProvider(): AIProvider {
  if (appConfig.aiProvider === "mock") {
    return new MockProvider();
  }

  if (appConfig.aiProvider === "groq") {
    if (!process.env.GROQ_API_KEY?.trim()) {
      throw new AIProviderError(
        "GROQ_KEY_MISSING",
        503,
        "Groq is selected but GROQ_API_KEY is not configured. Add it to .env.local and restart the server."
      );
    }
    return new GroqProvider();
  }

  if (appConfig.aiProvider === "gemini") {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      throw new AIProviderError(
        "GEMINI_KEY_MISSING",
        503,
        "Gemini is selected but GEMINI_API_KEY is not configured. Add it to .env.local and restart the development server, or set AI_PROVIDER=mock to use the labelled development script."
      );
    }
    return new GeminiProvider();
  }

  throw new AIProviderError(
    "AI_PROVIDER_INVALID",
    503,
    "AI_PROVIDER must be set to gemini, groq, or mock."
  );
}

export function getAIProviderMode(): "gemini" | "groq" | "mock" {
  if (appConfig.aiProvider === "gemini") return "gemini";
  if (appConfig.aiProvider === "groq") return "groq";
  if (appConfig.aiProvider === "mock") return "mock";
  throw new AIProviderError(
    "AI_PROVIDER_INVALID",
    503,
    "AI_PROVIDER must be set to gemini, groq, or mock."
  );
}
