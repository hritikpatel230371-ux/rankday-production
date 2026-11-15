import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { RankCard } from "@/components/rank-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankTrend } from "@/components/charts";

export default async function RankPage() {
  const user = await requireUser();
  const [current, history] = await Promise.all([
    prisma.rankSnapshot.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.rankSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 60,
      select: { date: true, score: true }
    })
  ]);
  const reasons = (current?.reasons as Array<{ label: string; delta: number; tone: "positive" | "negative" | "neutral" }> | null) ?? [];
  return (
    <>
      <PageHeader title="Rank" description="A deterministic personal progression score. AI never decides your rank directly." />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <RankCard score={current?.score ?? null} delta={current?.delta ?? 0} reasons={reasons} />
        <Card>
          <CardHeader><CardTitle>Why did my rank change?</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reasons.length ? reasons.map((reason) => <div key={reason.label} className="flex justify-between rounded-md border p-3 text-sm"><span>{reason.label}</span><span className={reason.delta >= 0 ? "text-emerald-500" : "text-rose-500"}>{reason.delta >= 0 ? "+" : ""}{reason.delta}</span></div>) : <p className="text-sm text-muted-foreground">No rank snapshot yet.</p>}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {history.length ? <RankTrend data={history.map((item) => ({ date: format(item.date, "MMM d"), score: item.score }))} /> : <p className="text-sm text-muted-foreground">Confirm a daily log to start rank history.</p>}
        </CardContent>
      </Card>
    </>
  );
}
