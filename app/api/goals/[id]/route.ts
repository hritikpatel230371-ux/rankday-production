import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userOwnsRelatedRecords } from "@/lib/ownership";
import { goalSchema } from "@/validation/forms";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const body = goalSchema.partial().parse(await request.json());
    if (!await userOwnsRelatedRecords(user.id, body)) return fail("A selected subject or category was not found.", 404);
    const update = await prisma.goal.updateMany({ where: { id, userId: user.id }, data: body });
    if (!update.count) return fail("Goal not found.", 404);
    const goal = await prisma.goal.findFirst({ where: { id, userId: user.id } });
    if (!goal) return fail("Goal not found.", 404);
    return ok({ goal });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const deleted = await prisma.goal.deleteMany({ where: { id, userId: user.id } });
    if (!deleted.count) return fail("Goal not found.", 404);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
