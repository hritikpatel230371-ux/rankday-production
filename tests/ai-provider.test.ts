import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "@/ai/gemini-provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("AI provider selection", () => {
  it("does not silently fall back when Gemini is selected without a key", async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.resetModules();

    const { getAIProvider } = await import("@/ai");
    expect(() => getAIProvider()).toThrow(/GEMINI_API_KEY is not configured/i);
  });

  it("uses mock mode only when it is explicitly selected", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.resetModules();

    const { getAIProvider, getAIProviderMode } = await import("@/ai");
    expect(getAIProviderMode()).toBe("mock");
    expect(await getAIProvider().generateReelScript({
      rangeLabel: "Today",
      facts: ["Studied DBMS for 25 minutes"]
    })).toContain("Studied DBMS for 25 minutes");
  });
});

describe("Gemini Reel generation", () => {
  it("uses the supported model and parses the returned script", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ script: "A short, fact-based script." }) }] } }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("test-key");
    await expect(provider.generateReelScript({
      rangeLabel: "Today",
      facts: ["Studied DBMS for 25 minutes"]
    })).resolves.toBe("A short, fact-based script.");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/models/gemini-2.5-flash:generateContent");
    expect(url).not.toContain("test-key");
    expect(new Headers(options.headers).get("x-goog-api-key")).toBe("test-key");
  });

  it("returns an actionable quota error without exposing provider details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));

    const provider = new GeminiProvider("test-key");
    await expect(provider.generateReelScript({
      rangeLabel: "Today",
      facts: ["Studied DBMS"]
    })).rejects.toMatchObject({
      code: "GEMINI_QUOTA",
      status: 503,
      userMessage: expect.stringMatching(/quota|rate limit/i)
    });
  });
});
