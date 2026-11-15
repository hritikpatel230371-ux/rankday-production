import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireApiUser();
    const [current, history] = await Promise.all([
      prisma.rankSnapshot.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      prisma.rankSnapshot.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 60 })
    ]);
    return ok({ current, history });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
