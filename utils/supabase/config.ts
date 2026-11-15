import { z } from "zod";

const supabaseConfigSchema = z.object({
  url: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  publishableKey: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.")
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  const parsed = supabaseConfigSchema.safeParse({
    url,
    publishableKey
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
