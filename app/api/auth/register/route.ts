import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, fail, ok } from "@/lib/api";
import { registrationSchema } from "@/validation/forms";
import { setSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { ensureUserDefaults } from "@/lib/onboarding";
import { rateLimit } from "@/lib/rate-limit";

/**
 * User Registration Endpoint: POST /api/auth/register
 *
 * Registration Pipeline & Security Architecture:
 * 1. Zod Validation (registrationSchema):
 *    - Enforces minimum 12 characters for passwords (NIST SP 800-63B standard).
 *    - Enforces 72-byte max password limit (protects against bcrypt truncation artifacts).
 *    - Validates email format and ensures password matches confirmPassword.
 * 2. Rate Limiting:
 *    - Limits registration attempts to 5 per minute per email to defeat automated bots.
 * 3. Case-Insensitive Email Collision Check:
 *    - Queries Prisma with { mode: "insensitive" } to guarantee unique emails.
 * 4. Password Hashing:
 *    - Hashes password using bcrypt with cryptographic salt rounds.
 * 5. Atomic Transaction:
 *    - Creates User record and seeds onboarding defaults (profile, study categories, rank weights)
 *      in a single Prisma transaction to avoid orphaned user state.
 * 6. Session Issuance:
 *    - Generates signed session cookie for immediate auto-login upon registration.
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate input against strict registration schema (including 12-char password check)
    const body = registrationSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    // Step 2: Rate limit account creation to mitigate bot spam and brute force
    const limited = rateLimit(`register:${email}`, 5, 60_000);
    if (!limited.allowed) {
      return fail("Too many registration attempts. Please try again in a minute.", 429);
    }

    // Step 3: Check if email is already registered (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true }
    });
    if (existing) return fail("An account already exists for this email.", 409);

    // Step 4: Securely hash password with bcrypt
    const passwordHash = await hashPassword(body.password);

    // Step 5: Execute atomic database transaction (User + Default Profile + Categories)
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, name: body.name, passwordHash },
        select: { id: true, name: true, email: true }
      });
      await ensureUserDefaults(created.id, tx);
      return created;
    });

    // Step 6: Create authenticated session and set HTTP-only cookie
    await setSession(user.id);
    return ok({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    // Handle database unique constraint collision (P2002)
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return fail("An account already exists for this email.", 409);
    }
    return apiError(error);
  }
}
