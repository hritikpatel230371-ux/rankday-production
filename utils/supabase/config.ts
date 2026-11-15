import { z } from "zod";

const supabaseConfigSchema = z.object({
  url: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  publishableKey: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.")
});

export function getSupabaseConfig() {
  const parsed = supabaseConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid Supabase configuration: ${details}`);
  }

  return parsed.data;
}
