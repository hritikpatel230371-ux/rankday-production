import { endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { calculateRank } from "@/lib/rank-engine";
import type { RankWeights } from "@/lib/rank-engine/types";

const componentKeys: Array<keyof RankWeights> = [
  "goalCompletion",
  "studyProgress",
  "examPreparedness",
  "testPerformance",
  "consistency",
  "timeManagement",
  "longTermProgress"
];

function readPreviousComponents(value: unknown): Partial<Record<keyof RankWeights, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    componentKeys.flatMap((key) => {
      const component = (value as Record<string, unknown>)[key];
      return typeof component === "number" && Number.isFinite(component) ? [[key, component]] : [];
    })
  );
}

export async function calculateUserRank(userId: string, date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const [latest, profile, activities, goals, tasks, exams, tests, subjects] = await Promise.all([
    prisma.rankSnapshot.findFirst({ where: { userId, date: { lt: dayStart } }, orderBy: { date: "desc" } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.activity.findMany({ where: { userId, confirmed: true, date: { gte: dayStart, lte: dayEnd } }, include: { category: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { userId } }),
    prisma.exam.findMany({ where: { userId, examDate: { gte: dayStart } } }),
    prisma.test.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 5 }),
    prisma.subject.findMany({ where: { userId }, include: { units: { include: { topics: true } } } })
  ]);

  const syllabus = subjects.flatMap((subject) => subject.units.flatMap((unit) => unit.topics));
  const recentSnapshots = await prisma.rankSnapshot.findMany({
    where: { userId, delta: { gt: 0 }, date: { gte: subDays(dayStart, 14), lt: dayStart } },
    orderBy: { date: "desc" }
  });
  const positiveSnapshotDays = new Set(recentSnapshots.map((snapshot) => startOfDay(snapshot.date).getTime()));
  let streakDays = 0;
  for (let daysAgo = 1; daysAgo <= 14; daysAgo += 1) {
    if (!positiveSnapshotDays.has(startOfDay(subDays(dayStart, daysAgo)).getTime())) break;
    streakDays += 1;
  }

  return calculateRank({
    previousScore: latest?.score ?? 620,
    date,
    dailyStudyTargetMinutes: profile?.dailyStudyTargetMin ?? 240,
    activities: activities.map((activity) => ({
      title: activity.title,
      durationMinutes: activity.durationMinutes,
      plannedMinutes: activity.plannedMinutes,
      sentiment: activity.sentiment,
      importance: activity.importance,
      category: activity.category?.name
    })),
    goals: goals.map((goal) => ({
      progress: goal.progress,
      status: goal.status,
      priority: goal.priority,
      dueDate: goal.dueDate
    })),
    tasks: tasks.map((task) => ({
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes
    })),
    exams: exams.map((exam) => ({ examDate: exam.examDate, priority: exam.priority, preparedness: syllabus.length ? syllabus.filter((topic) => topic.completed).length / syllabus.length : null })),
    tests: tests.map((test) => ({ percentage: test.percentage, date: test.date })),
    syllabus: syllabus.map((topic) => ({ completed: topic.completed, difficulty: topic.difficulty, priority: topic.priority })),
    streakDays,
    previousComponents: readPreviousComponents(latest?.components),
    weights: (profile?.rankWeights as Record<string, number> | null) ?? undefined
  });
}
