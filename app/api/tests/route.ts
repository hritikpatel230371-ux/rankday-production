import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userOwnsRelatedRecords } from "@/lib/ownership";
import { calculateTestPercentage } from "@/lib/rank-engine";
import { testSchema } from "@/validation/forms";

export async function GET() {
  try {
    const user = await requireApiUser();
    return ok({ tests: await prisma.test.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, include: { subject: true } }) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = testSchema.parse(await request.json());
    if (!await userOwnsRelatedRecords(user.id, body)) return fail("The selected subject was not found.", 404);
    const test = await prisma.test.create({ data: { ...body, userId: user.id, percentage: calculateTestPercentage(body.obtainedMarks, body.totalMarks) } });
    return ok({ test }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
