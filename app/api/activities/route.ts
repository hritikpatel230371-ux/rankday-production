import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { activityCreateSchema } from "@/validation/forms";

export async function GET() {
  try {
    const user = await requireApiUser();
    const activities = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 100,
      include: { category: true, subject: true }
    });
    return ok({ activities });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = activityCreateSchema.parse(await request.json());
    const activity = await prisma.activity.create({
      data: {
        userId: user.id,
        title: body.title || "Untitled activity",
        date: body.date ?? new Date(),
        durationMinutes: body.durationMinutes ?? null,
        sentiment: body.sentiment ?? "NEUTRAL",
        importance: body.importance ?? "MEDIUM",
        confirmed: true
      }
    });
    return ok({ activity }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
