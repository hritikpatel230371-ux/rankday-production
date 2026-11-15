import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMinutes } from "@/lib/utils";

export default async function PlannerPage() {
  const user = await requireUser();
  const [tasks, goals, exams] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: { id: true, title: true, estimatedMinutes: true }
    }),
    prisma.goal.findMany({
      where: { userId: user.id, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, title: true, progress: true }
    }),
    prisma.exam.findMany({
      where: { userId: user.id, examDate: { gte: new Date() } },
      orderBy: { examDate: "asc" },
      take: 4,
      select: { id: true, name: true, priority: true }
    })
  ]);
  return (
    <>
      <PageHeader title="Planner" description="Daily, weekly, and monthly planning views connected to your goals and exams." />
      <div className="grid gap-5 lg:grid-cols-3">
        <PlanColumn title="Today" items={tasks.slice(0, 4).map((task) => `${task.title} · ${formatMinutes(task.estimatedMinutes)}`)} />
        <PlanColumn title="This week" items={goals.map((goal) => `${goal.title} · ${goal.progress}%`)} />
        <PlanColumn title="Upcoming exams" items={exams.map((exam) => `${exam.name} · ${exam.priority}`)} />
      </div>
      <Card className="mt-5"><CardHeader><CardTitle>Time allocation</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Badge>Daily planning</Badge><Badge>Weekly planning</Badge><Badge>Monthly planning</Badge></CardContent></Card>
    </>
  );
}

function PlanColumn({ title, items }: { title: string; items: string[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{items.length ? items.map((item) => <div key={item} className="rounded-md border p-3 text-sm">{item}</div>) : <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing planned yet.</div>}</CardContent></Card>;
}
