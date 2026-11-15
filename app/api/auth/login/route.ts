import { NextRequest } from "next/server";
import { apiError, fail, ok } from "@/lib/api";
import { loginSchema } from "@/validation/forms";
import { setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const limited = rateLimit(`login:${email}`, 8, 60_000);
    if (!limited.allowed) {
      return fail("Too many login attempts. Please try again in a minute.", 429);
    }

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return fail("Invalid email or password.", 401);
    }
    await setSession(user.id);
    return ok({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return apiError(error);
  }
}
