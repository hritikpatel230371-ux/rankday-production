import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "positive" | "negative" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "positive" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        tone === "negative" && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
        tone === "neutral" && "border-border bg-secondary text-secondary-foreground",
        className
      )}
      {...props}
    />
  );
}
