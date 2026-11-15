import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireApiUser();
    const [activities, goals, tasks, exams, tests, rankSnapshots] = await Promise.all([
      prisma.activity.findMany({ where: { userId: user.id } }),
      prisma.goal.findMany({ where: { userId: user.id } }),
      prisma.task.findMany({ where: { userId: user.id } }),
      prisma.exam.findMany({ where: { userId: user.id } }),
      prisma.test.findMany({ where: { userId: user.id } }),
      prisma.rankSnapshot.findMany({ where: { userId: user.id } })
    ]);
    return ok({ exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email, name: user.name }, activities, goals, tasks, exams, tests, rankSnapshots });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
