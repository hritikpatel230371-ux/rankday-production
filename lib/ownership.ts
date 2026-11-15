import { prisma } from "@/lib/prisma";

type RelatedRecordIds = {
  categoryId?: string | null;
  goalId?: string | null;
  subjectId?: string | null;
};

export async function userOwnsRelatedRecords(userId: string, ids: RelatedRecordIds) {
  const checks: Promise<unknown>[] = [];
  if (ids.categoryId) checks.push(prisma.category.findFirst({ where: { id: ids.categoryId, userId }, select: { id: true } }));
  if (ids.goalId) checks.push(prisma.goal.findFirst({ where: { id: ids.goalId, userId }, select: { id: true } }));
  if (ids.subjectId) checks.push(prisma.subject.findFirst({ where: { id: ids.subjectId, userId }, select: { id: true } }));
  const records = await Promise.all(checks);
  return records.every(Boolean);
}
