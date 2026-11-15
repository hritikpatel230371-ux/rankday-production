import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userOwnsRelatedRecords } from "@/lib/ownership";
import { taskSchema } from "@/validation/forms";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const body = taskSchema.partial().parse(await request.json());
    if (!await userOwnsRelatedRecords(user.id, body)) return fail("A selected task, subject, or category was not found.", 404);
    const update = await prisma.task.updateMany({
      where: { id, userId: user.id },
      data: { ...body, completedAt: body.status === "COMPLETED" ? new Date() : body.status ? null : undefined }
    });
    if (!update.count) return fail("Task not found.", 404);
    const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!task) return fail("Task not found.", 404);
    return ok({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const deleted = await prisma.task.deleteMany({ where: { id, userId: user.id } });
    if (!deleted.count) return fail("Task not found.", 404);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
