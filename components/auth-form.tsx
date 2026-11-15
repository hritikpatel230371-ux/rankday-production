"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * AuthForm Component
 *
 * Handles both user authentication (login) and account creation (registration).
 *
 * Key Security & Validation Rules:
 * - Registration enforces a strict minimum password length of 12 characters
 *   (recommended by NIST SP 800-63B to prevent brute-force attacks).
 * - Real-time password length meter gives immediate visual feedback before form submission.
 * - Exact password match confirmation prevents user lockout due to typos.
 * - Client-side preflight checks avoid unnecessary network roundtrips when validation fails.
 */
export function AuthForm({ mode = "login" }: { mode?: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isRegister = mode === "register";
  const passwordLength = password.length;
  const isPasswordLengthValid = passwordLength >= 12;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");

    const payload = Object.fromEntries(formData.entries());
    const pass = String(payload.password || "");
    const confirmPass = String(payload.confirmPassword || "");

    // 1. Password minimum length validation (Registration requires at least 12 characters)
    if (isRegister && pass.length < 12) {
      setError("Password must be at least 12 characters long for security.");
      setLoading(false);
      return;
    }

    // 2. Password confirmation matching validation
    if (isRegister && pass !== confirmPass) {
      setError("Passwords do not match. Please re-enter your password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "Authentication failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach RankDay. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isRegister ? "Create your account" : "Welcome back"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="space-y-4">
          {isRegister ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <Input
                name="name"
                placeholder="e.g. Alex Johnson"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Email Address</label>
            <Input
              name="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Password {isRegister ? "(min. 12 characters)" : ""}
              </label>
              {isRegister && passwordLength > 0 ? (
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isPasswordLengthValid ? "text-green-500 flex items-center gap-1" : "text-amber-500"
                  }`}
                >
                  {isPasswordLengthValid ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 inline" /> 12+ chars reached
                    </>
                  ) : (
                    `${passwordLength}/12 characters`
                  )}
                </span>
              ) : null}
            </div>

            <Input
              name="password"
              type="password"
              placeholder={isRegister ? "Create strong password (12+ characters)" : "Password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 12 : 8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Registration password requirements & security explanation */}
            {isRegister ? (
              <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                <span>
                  Must be at least 12 characters long. Passwords with 12+ characters protect against brute-force attacks.
                </span>
              </div>
            ) : null}
          </div>

          {isRegister ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                {confirmPassword.length > 0 ? (
                  <span
                    className={`text-[11px] font-medium ${
                      passwordsMatch ? "text-green-500 flex items-center gap-1" : "text-destructive"
                    }`}
                  >
                    {passwordsMatch ? "Passwords match" : "Does not match"}
                  </span>
                ) : null}
              </div>

              <Input
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your 12+ character password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <Button asChild variant="ghost" className="mt-3 w-full">
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Already have an account? Sign in" : "Create a new account"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
