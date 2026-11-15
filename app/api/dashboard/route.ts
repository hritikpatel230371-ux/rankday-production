import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireApiUser();
    const [rank, previous, activities, tasks, goals, exams, tests] = await Promise.all([
      prisma.rankSnapshot.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      prisma.rankSnapshot.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 8 }),
      prisma.activity.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 8, include: { category: true, subject: true } }),
      prisma.task.findMany({ where: { userId: user.id }, orderBy: { dueDate: "asc" }, take: 8 }),
      prisma.goal.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 6 }),
      prisma.exam.findMany({ where: { userId: user.id, examDate: { gte: new Date() } }, orderBy: { examDate: "asc" }, take: 4, include: { subject: true } }),
      prisma.test.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 6, include: { subject: true } })
    ]);
    return ok({ user, rank, rankHistory: previous.reverse(), activities, tasks, goals, exams, tests });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
