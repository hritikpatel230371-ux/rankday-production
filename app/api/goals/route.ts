import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userOwnsRelatedRecords } from "@/lib/ownership";
import { goalSchema } from "@/validation/forms";

export async function GET() {
  try {
    const user = await requireApiUser();
    return ok({ goals: await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = goalSchema.parse(await request.json());
    if (!await userOwnsRelatedRecords(user.id, body)) return fail("A selected subject or category was not found.", 404);
    const goal = await prisma.goal.create({ data: { ...body, userId: user.id } });
    return ok({ goal }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
