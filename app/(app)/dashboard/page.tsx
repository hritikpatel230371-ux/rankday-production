import { format } from "date-fns";
import type { RankSnapshot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { RankCard } from "@/components/rank-card";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RankTrend } from "@/components/charts";
import { formatMinutes } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const [rank, history, activities, tasks, goals, exams] = await Promise.all([
    prisma.rankSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { date: "desc" }
    }),
    prisma.rankSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 14,
      select: { date: true, score: true }
    }),
    prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        durationMinutes: true,
        category: { select: { name: true } },
        subject: { select: { name: true } }
      }
    }),
    prisma.task.findMany({
      where: { userId: user.id, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { id: true, title: true, priority: true }
    }),
    prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, title: true, progress: true }
    }),
    prisma.exam.findMany({
      where: { userId: user.id, examDate: { gte: new Date() } },
      orderBy: { examDate: "asc" },
      take: 3,
      select: { id: true, name: true, examDate: true, subject: { select: { name: true } } }
    })
  ]);
  return renderDashboard({ user, rank, history, activities, tasks, goals, exams });
}

function renderDashboard({
  user,
  rank,
  history,
  activities,
  tasks,
  goals,
  exams
}: {
  user: { name: string };
  rank: RankSnapshot | null;
  history: Array<{ date: Date; score: number }>;
  activities: Array<{ title: string; durationMinutes?: number | null; subject?: { name?: string } | null; category?: { name?: string } | null }>;
  tasks: Array<{ title: string; priority?: string | null }>;
  goals: Array<{ title: string; progress?: number | null }>;
  exams: Array<{ id: string; name: string; examDate: Date; subject?: { name?: string } | null }>;
}) {
  const totalStudy = activities.reduce((sum, activity) => sum + (activity.durationMinutes || 0), 0);

  return (
    <>
      <PageHeader title={`Good evening, ${user.name}`} description={format(new Date(), "EEEE, MMMM d, yyyy")} />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <RankCard score={rank?.score ?? null} delta={rank?.delta ?? 0} reasons={(rank?.reasons as never[]) ?? []} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard title="Study logged" value={formatMinutes(totalStudy)} detail="recent activity" tone="positive" />
          <StatCard title="Open priorities" value={tasks.length} detail={tasks.length ? "needs focus" : "clear"} tone={tasks.length ? "negative" : "positive"} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Rank trend</CardTitle></CardHeader>
          <CardContent>
            {history.length ? <RankTrend data={history.map((item) => ({ date: format(item.date, "MMM d"), score: item.score }))} /> : <Empty label="No rank history yet. Confirm a daily log to create your first snapshot." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming exams</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {exams.length ? exams.map((exam) => {
              const days = Math.max(0, Math.ceil((exam.examDate.getTime() - Date.now()) / 86_400_000));
              return <div key={exam.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{exam.name}</p><p className="text-sm text-muted-foreground">{exam.subject?.name ?? "General"} · {format(exam.examDate, "MMM d")}</p></div><Badge tone={days <= 7 ? "negative" : "neutral"}>{days} days</Badge></div>;
            }) : <Empty label="No exams added yet." />}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ListCard title="Recent activities" items={activities.map((activity) => `${activity.title} · ${formatMinutes(activity.durationMinutes)}`)} empty="No activities recorded yet." />
        <ListCard title="Today's tasks" items={tasks.map((task) => `${task.title} · ${task.priority}`)} empty="No tasks waiting." />
        <ListCard title="Goals" items={goals.map((goal) => `${goal.title} · ${goal.progress}%`)} empty="No goals created yet." />
      </div>
    </>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{label}</div>;
}

function ListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length ? items.map((item) => <div key={item} className="rounded-md border p-3 text-sm">{item}</div>) : <Empty label={empty} />}
      </CardContent>
    </Card>
  );
}
