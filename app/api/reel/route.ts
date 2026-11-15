import { NextRequest } from "next/server";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { z } from "zod";
import { getAIProvider, getAIProviderMode } from "@/ai";
import { toAIProviderResponse } from "@/ai/errors";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const reelRequestSchema = z.object({
  rangeLabel: z.string().trim().min(1).max(40).default("Today"),
  tone: z.enum(["natural", "funny", "emotional", "professional"]).default("natural")
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const limited = rateLimit(`reel:${user.id}`, 10, 60_000);
    if (!limited.allowed) return fail("Reel generation is cooling down. Please try again soon.", 429);
    const body = reelRequestSchema.parse(await request.json());
    const now = new Date();
    const isWeekRange = body.rangeLabel.toLowerCase().includes("week") || body.rangeLabel.toLowerCase().includes("7");
    const startDate = isWeekRange ? subDays(startOfDay(now), 7) : startOfDay(now);
    const dayEnd = endOfDay(now);

    let activities = await prisma.activity.findMany({
      where: { userId: user.id, confirmed: true, date: { gte: startDate, lte: dayEnd } },
      orderBy: { date: "desc" },
      take: 10,
      include: { subject: true }
    });

    let effectiveRange = body.rangeLabel || "Today";

    // If today is requested but empty, check if recent activities exist in the past 7 days
    if (!activities.length && !isWeekRange) {
      const recentActivities = await prisma.activity.findMany({
        where: { userId: user.id, confirmed: true, date: { gte: subDays(startOfDay(now), 7), lte: dayEnd } },
        orderBy: { date: "desc" },
        take: 8,
        include: { subject: true }
      });
      if (recentActivities.length) {
        activities = recentActivities;
        effectiveRange = "Recent Days";
      }
    }

    const [rank, tasks, goals, upcomingExams] = await Promise.all([
      prisma.rankSnapshot.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      prisma.task.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 4 }),
      prisma.goal.findMany({ where: { userId: user.id, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, take: 3 }),
      prisma.exam.findMany({ where: { userId: user.id, examDate: { gte: now } }, orderBy: { examDate: "asc" }, take: 2, include: { subject: true } })
    ]);

    const facts: string[] = [];

    if (activities.length) {
      activities.forEach((act) => {
        facts.push(`${act.title}${act.durationMinutes ? ` for ${act.durationMinutes} minutes` : ""}`);
      });
    }

    if (rank) {
      facts.push(`Rank score standing at ${rank.score} (${rank.delta >= 0 ? "+" : ""}${rank.delta} change)`);
    }

    tasks.filter((t) => t.status === "COMPLETED").slice(0, 3).forEach((task) => {
      facts.push(`Completed task: ${task.title}`);
    });

    goals.forEach((goal) => {
      facts.push(`Working on goal: ${goal.title} (${goal.progress}% progress)`);
    });

    upcomingExams.forEach((exam) => {
      facts.push(`Upcoming exam: ${exam.name} on ${format(exam.examDate, "MMM d")}`);
    });

    if (!facts.length) {
      return fail("Log a confirmed activity or add a goal to generate a personalized Reel script.", 422);
    }

    const script = await getAIProvider().generateReelScript({
      rangeLabel: effectiveRange,
      facts,
      tone: body.tone || "natural"
    });

    return ok({ script, provider: getAIProviderMode(), rangeLabel: effectiveRange });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    const providerError = toAIProviderResponse(error);
    if (providerError) return providerError;
    return apiError(error);
  }
}
