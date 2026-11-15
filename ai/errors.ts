import { fail } from "@/lib/api";

export class AIProviderError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly userMessage: string
  ) {
    super(userMessage);
    this.name = "AIProviderError";
  }
}

export function toAIProviderResponse(error: unknown) {
  if (!(error instanceof AIProviderError)) return null;
  console.error("AI provider error", { code: error.code, status: error.status });
  return fail(error.userMessage, error.status);
}
