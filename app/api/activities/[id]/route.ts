import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { activityUpdateSchema } from "@/validation/forms";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const body = activityUpdateSchema.parse(await request.json());
    const update = await prisma.activity.updateMany({ where: { id, userId: user.id }, data: body });
    if (!update.count) return fail("Activity not found.", 404);
    const activity = await prisma.activity.findFirst({ where: { id, userId: user.id } });
    if (!activity) return fail("Activity not found.", 404);
    return ok({ activity });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const deleted = await prisma.activity.deleteMany({ where: { id, userId: user.id } });
    if (!deleted.count) return fail("Activity not found.", 404);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
