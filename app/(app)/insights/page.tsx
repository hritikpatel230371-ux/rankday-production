import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReelGenerator } from "@/components/reel-generator";

export default async function InsightsPage() {
  const user = await requireUser();
  const [activities, tasks, rank, exams] = await Promise.all([
    prisma.activity.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 20 }),
    prisma.task.findMany({ where: { userId: user.id, status: { not: "COMPLETED" } } }),
    prisma.rankSnapshot.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.exam.findMany({ where: { userId: user.id, examDate: { gte: new Date() } }, orderBy: { examDate: "asc" }, take: 1 })
  ]);
  const studyMinutes = activities.filter((item) => item.sentiment === "POSITIVE").reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  const wastedMinutes = activities.filter((item) => item.sentiment === "NEGATIVE").reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  const insights = [
    rank ? `Your current rank is ${rank.score}, with a latest change of ${rank.delta >= 0 ? "+" : ""}${rank.delta}.` : "No rank snapshot exists yet.",
    studyMinutes ? `You have ${Math.round(studyMinutes / 60)} hours of positive activity in recent logs.` : "Add a daily log to unlock study insights.",
    wastedMinutes ? `Recent distraction time is ${Math.round(wastedMinutes / 60)} hours. Recovery works best with one protected block tomorrow.` : "No recent negative time blocks recorded.",
    exams[0] ? `${exams[0].name} is your next exam.` : "No upcoming exam pressure recorded.",
    tasks.length ? `${tasks.length} open tasks are waiting.` : "Your task list is clear."
  ];
  return (
    <>
      <PageHeader title="AI Insights" description="Scripts use your saved facts only. Development mock output is labelled; Gemini requires a configured API key." />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]">
        <Card><CardHeader><CardTitle>Today’s guidance</CardTitle></CardHeader><CardContent className="space-y-3">{insights.map((item) => <div key={item} className="rounded-md border p-3 text-sm">{item}</div>)}</CardContent></Card>
        <ReelGenerator />
      </div>
    </>
  );
}
