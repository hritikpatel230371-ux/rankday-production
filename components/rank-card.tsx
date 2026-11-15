import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function RankCard({ score, delta = 0, reasons = [] }: { score: number | null; delta?: number; reasons?: Array<{ label: string; delta: number; tone: "positive" | "negative" | "neutral" }> }) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-premium">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Rank</p>
            <CardTitle className="mt-2 text-4xl md:text-5xl">{score === null ? "Not ranked yet" : `${score} / 1000`}</CardTitle>
          </div>
          {score === null ? <Badge tone="neutral">No score yet</Badge> : <Badge tone={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta} today</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={score === null ? 0 : score / 10} />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {reasons.slice(0, 4).map((reason) => (
            <div key={reason.label} className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2 text-sm">
              <span className="truncate">{reason.label}</span>
              <span className={reason.delta >= 0 ? "text-emerald-500" : "text-rose-500"}>{reason.delta >= 0 ? "+" : ""}{reason.delta}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
