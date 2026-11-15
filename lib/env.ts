import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string()
    .trim()
    .min(1, "Set DATABASE_URL to your Supabase PostgreSQL connection URI in both .env.local and .env.")
    .url("DATABASE_URL must be a valid PostgreSQL connection URI.")
    .refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
      message: "DATABASE_URL must be a PostgreSQL URI using postgresql:// or postgres://."
    }),
  AUTH_SECRET: z.string().trim().min(16, "AUTH_SECRET must be at least 16 characters long."),
  APP_NAME: z.string().trim().min(1).optional().default("RankDay"),
  AI_PROVIDER: z.enum(["mock", "gemini", "groq"]).optional().default("mock"),
  GEMINI_API_KEY: z.string().trim().optional().default(""),
  GROQ_API_KEY: z.string().trim().optional().default("")
});

export function getServerEnv() {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push("DATABASE_URL (set your Supabase PostgreSQL connection URI in both .env.local and .env)");
  }

  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET?.trim()) {
    missing.push("AUTH_SECRET");
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env.local and set the required values.`);
  }

  const authSecret = getAuthSecret();

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: authSecret,
    APP_NAME: process.env.APP_NAME,
    AI_PROVIDER: process.env.AI_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  return parsed.data;
}

export function getAuthSecret() {
  const configuredSecret = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  const secret = configuredSecret ?? "development-rankday-secret-123456";
  if (process.env.NODE_ENV === "production" && Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("AUTH_SECRET must be at least 32 bytes in production.");
  }
  return secret;
}
