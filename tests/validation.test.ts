import { describe, expect, it } from "vitest";
import { aiDailyLogSchema, aiInsightsResponseSchema, aiReelResponseSchema } from "@/validation/ai";
import { registrationSchema, testSchema } from "@/validation/forms";

describe("AI JSON validation", () => {
  it("accepts structured extraction", () => {
    const parsed = aiDailyLogSchema.parse({ activities: [{ title: "Studied DBMS", category: "Education", durationMinutes: 180, sentiment: "POSITIVE", importance: "HIGH" }] });
    expect(parsed.activities[0].title).toBe("Studied DBMS");
  });

  it("rejects unsafe duration values", () => {
    expect(() => aiDailyLogSchema.parse({ activities: [{ title: "Impossible", category: "Other", durationMinutes: 9999 }] })).toThrow();
  });

  it("rejects test scores above the maximum marks", () => {
    expect(() => testSchema.parse({
      name: "Practice test",
      date: "2026-10-22",
      obtainedMarks: 101,
      totalMarks: 100
    })).toThrow(/cannot exceed/i);
    expect(() => aiDailyLogSchema.parse({
      tests: [{ name: "Practice test", obtainedMarks: 101, totalMarks: 100 }]
    })).toThrow(/cannot exceed/i);
  });

  it("requires matching passwords of at least 12 characters for registration", () => {
    const valid = { name: "Test User", email: "person@example.com", password: "a-safe-password", confirmPassword: "a-safe-password" };
    expect(registrationSchema.parse(valid).email).toBe("person@example.com");
    expect(() => registrationSchema.parse({ ...valid, confirmPassword: "different-password" })).toThrow(/do not match/i);
    expect(() => registrationSchema.parse({ ...valid, password: "short", confirmPassword: "short" })).toThrow();
  });

  it("rejects malformed AI insight and Reel responses", () => {
    expect(() => aiInsightsResponseSchema.parse({ insights: [] })).toThrow();
    expect(() => aiReelResponseSchema.parse({ script: "" })).toThrow();
  });
});
