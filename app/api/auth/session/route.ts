import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail("Not authenticated.", 401);

  return ok({ user: { id: user.id, name: user.name, email: user.email } });
}
