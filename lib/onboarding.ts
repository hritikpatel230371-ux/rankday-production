import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultCategories, defaultSubjects } from "@/lib/defaults";

export async function ensureUserDefaults(userId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  await db.profile.upsert({
    where: { userId },
    update: {},
    create: { userId, onboardingComplete: false }
  });

  await db.category.createMany({
    data: defaultCategories.map(([name, slug, color]) => ({ userId, name, slug, color })),
    skipDuplicates: true
  });

  await db.subject.createMany({
    data: defaultSubjects.map(([name, color]) => ({ userId, name, color })),
    skipDuplicates: true
  });
}
