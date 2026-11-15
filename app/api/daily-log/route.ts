import { NextRequest } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { confirmDailyLogSchema } from "@/validation/forms";
import { calculateUserRank } from "@/lib/rank-engine/from-db";
import { calculateTestPercentage } from "@/lib/rank-engine";

function categorySlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "other";
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = confirmDailyLogSchema.parse(await request.json());
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const existingLog = await prisma.dailyLog.findFirst({
      where: { userId: user.id, rawText: body.rawText, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: "desc" }
    });

    const result = await prisma.$transaction(async (tx) => {
      const dailyLog = existingLog
        ? await tx.dailyLog.update({
            where: { id: existingLog.id },
            data: { date: now, summary: body.summary as object }
          })
        : await tx.dailyLog.create({
            data: { userId: user.id, date: now, rawText: body.rawText, summary: body.summary as object }
          });

      if (existingLog) {
        await tx.activity.deleteMany({ where: { dailyLogId: dailyLog.id } });
        await tx.test.deleteMany({ where: { dailyLogId: dailyLog.id } });
      }

      const activityCategories = uniqueBy(body.activities, (item) => categorySlug(item.category));
      if (activityCategories.length) {
        await tx.category.createMany({
          data: activityCategories.map((item) => ({
            userId: user.id,
            name: item.category,
            slug: categorySlug(item.category),
            color: "#94a3b8"
          })),
          skipDuplicates: true
        });
      }

      const categorySlugs = activityCategories.map((item) => categorySlug(item.category));
      const subjectNames = uniqueBy(
        [...body.activities.map((item) => item.subject), ...body.tests.map((item) => item.subject)]
          .filter((name): name is string => Boolean(name?.trim())),
        (name) => name.toLowerCase()
      );
      const [categories, subjects] = await Promise.all([
        categorySlugs.length
          ? tx.category.findMany({ where: { userId: user.id, slug: { in: categorySlugs } }, select: { id: true, slug: true } })
          : Promise.resolve([]),
        subjectNames.length
          ? tx.subject.findMany({ where: { userId: user.id, name: { in: subjectNames, mode: "insensitive" } }, select: { id: true, name: true } })
          : Promise.resolve([])
      ]);
      const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));
      const subjectIds = new Map(subjects.map((subject) => [subject.name.toLowerCase(), subject.id]));

      if (body.activities.length) {
        await tx.activity.createMany({
          data: body.activities.map((item) => ({
            userId: user.id,
            dailyLogId: dailyLog.id,
            categoryId: categoryIds.get(categorySlug(item.category)),
            subjectId: item.subject ? subjectIds.get(item.subject.toLowerCase()) : undefined,
            title: item.title,
            date: now,
            durationMinutes: item.durationMinutes ?? null,
            plannedMinutes: item.plannedMinutes ?? null,
            sentiment: item.sentiment,
            importance: item.importance,
            confidence: item.confidence,
            needsConfirmation: item.needsConfirmation ?? false,
            confirmed: true
          }))
        });
      }

      if (body.tests.length) {
        await tx.test.createMany({
          data: body.tests.map((item) => ({
            userId: user.id,
            dailyLogId: dailyLog.id,
            subjectId: item.subject ? subjectIds.get(item.subject.toLowerCase()) : undefined,
            name: item.name,
            date: now,
            obtainedMarks: item.obtainedMarks,
            totalMarks: item.totalMarks,
            percentage: calculateTestPercentage(item.obtainedMarks, item.totalMarks),
            difficulty: item.difficulty
          }))
        });
      }

      return dailyLog;
    }, { timeout: 15_000 });

    const rank = await calculateUserRank(user.id, now);
    const existingSnapshot = await prisma.rankSnapshot.findFirst({
      where: { userId: user.id, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { date: "desc" }
    });
    await prisma.$transaction(async (tx) => {
      const snapshotData = {
        date: dayStart,
        score: rank.score,
        delta: rank.delta,
        reasons: rank.reasons,
        components: rank.components
      };
      if (existingSnapshot) {
        await tx.rankSnapshot.update({ where: { id: existingSnapshot.id }, data: snapshotData });
      } else {
        await tx.rankSnapshot.create({ data: { ...snapshotData, userId: user.id } });
      }
      await tx.dailyLog.update({ where: { id: result.id }, data: { rankDelta: rank.delta } });
    });

    return ok({ dailyLogId: result.id, rank });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
