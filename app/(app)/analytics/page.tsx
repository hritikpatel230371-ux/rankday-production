import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankTrend, SimpleBars } from "@/components/charts";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [history, activities, tests, subjects] = await Promise.all([
    prisma.rankSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 60,
      select: { date: true, score: true }
    }),
    prisma.activity.findMany({
      where: { userId: user.id },
      select: { durationMinutes: true, category: { select: { name: true } } }
    }),
    prisma.test.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      select: { name: true, percentage: true, subject: { select: { name: true } } }
    }),
    prisma.subject.findMany({
      where: { userId: user.id },
      select: {
        name: true,
        units: {
          select: {
            topics: {
              select: { completed: true }
            }
          }
        }
      }
    })
  ]);
  const categoryData = Object.values(activities.reduce<Record<string, { name: string; value: number }>>((acc, activity) => {
    const name = activity.category?.name ?? "Other";
    acc[name] ??= { name, value: 0 };
    acc[name].value += activity.durationMinutes || 0;
    return acc;
  }, {}));
  const syllabusData = subjects.map((subject) => {
    const topics = subject.units.flatMap((unit) => unit.topics);
    return { name: subject.name, value: topics.length ? Math.round((topics.filter((topic) => topic.completed).length / topics.length) * 100) : 0 };
  });
  return (
    <>
      <PageHeader title="Analytics" description="Rank, study distribution, syllabus, tests, and consistency signals." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Rank history</CardTitle></CardHeader><CardContent>{history.length ? <RankTrend data={history.map((item) => ({ date: format(item.date, "MMM d"), score: item.score }))} /> : <Empty />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Category time</CardTitle></CardHeader><CardContent>{categoryData.length ? <SimpleBars data={categoryData} /> : <Empty />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Syllabus progress</CardTitle></CardHeader><CardContent>{syllabusData.length ? <SimpleBars data={syllabusData} /> : <Empty />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Test scores</CardTitle></CardHeader><CardContent>{tests.length ? <SimpleBars data={tests.map((test) => ({ name: test.subject?.name ?? test.name, value: Math.round(test.percentage) }))} /> : <Empty />}</CardContent></Card>
      </div>
    </>
  );
}

function Empty() {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Not enough data yet.</div>;
}
