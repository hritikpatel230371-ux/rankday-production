import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userOwnsRelatedRecords } from "@/lib/ownership";
import { taskSchema } from "@/validation/forms";

export async function GET() {
  try {
    const user = await requireApiUser();
    return ok({ tasks: await prisma.task.findMany({ where: { userId: user.id }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] }) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = taskSchema.parse(await request.json());
    if (!await userOwnsRelatedRecords(user.id, body)) return fail("A selected task, subject, or category was not found.", 404);
    const task = await prisma.task.create({ data: { ...body, userId: user.id, completedAt: body.status === "COMPLETED" ? new Date() : null } });
    return ok({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Please sign in again.", 401);
    return apiError(error);
  }
}
