import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, init);
}

export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResult<never>>({ ok: false, error, details }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Please check the highlighted information and try again.", 422, error.flatten());
  }
  console.error("API error", error instanceof Error ? error.message : String(error));
  return fail("Something went wrong. Please try again.", 500);
}
