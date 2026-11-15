import { NextRequest } from "next/server";
import { getAIProvider } from "@/ai";
import { toAIProviderResponse } from "@/ai/errors";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { dailyLogTextSchema } from "@/validation/forms";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const limited = rateLimit(`ai:${user.id}`, 10, 60_000);
    if (!limited.allowed) return fail("AI analysis is cooling down. Please try again in a minute.", 429);
    const { text } = dailyLogTextSchema.parse(await request.json());
    const analysis = await getAIProvider().analyzeDailyLog(text);
    return ok(analysis);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    const providerError = toAIProviderResponse(error);
    if (providerError) return providerError;
    return apiError(error);
  }
}
