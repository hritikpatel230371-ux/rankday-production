import { describe, expect, it, vi } from "vitest";

describe("server environment validation", () => {
  it("requires a database connection string for Prisma-backed runtime", async () => {
    const { getServerEnv } = await import("@/lib/env");
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      expect(() => getServerEnv()).toThrow(/DATABASE_URL/i);
    } finally {
      if (original) {
        process.env.DATABASE_URL = original;
      }
    }
  });

  it("rejects an empty database connection string", async () => {
    const { getServerEnv } = await import("@/lib/env");
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";

    try {
      expect(() => getServerEnv()).toThrow(/Supabase PostgreSQL connection URI/i);
    } finally {
      if (original === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = original;
      }
    }
  });

  it("requires a PostgreSQL URI rather than a Supabase API URL", async () => {
    const { getServerEnv } = await import("@/lib/env");
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "https://example.supabase.co";

    try {
      expect(() => getServerEnv()).toThrow(/PostgreSQL URI/i);
    } finally {
      if (original === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = original;
      }
    }
  });

  it("requires a configured strong session secret in production", async () => {
    const { getAuthSecret } = await import("@/lib/env");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");

    try {
      expect(() => getAuthSecret()).toThrow(/must be configured in production/i);
      vi.stubEnv("AUTH_SECRET", "too-short");
      expect(() => getAuthSecret()).toThrow(/at least 32 bytes/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
