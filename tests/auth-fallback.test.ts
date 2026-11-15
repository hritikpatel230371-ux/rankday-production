import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { readSessionToken } from "@/lib/auth";
import { getAuthSecret } from "@/lib/env";

describe("session validation", () => {
  it("rejects malformed or expired session tokens", () => {
    const AUTH_SECRET = getAuthSecret();
    const malformedBody = Buffer.from("not-json").toString("base64url");
    const malformedSignature = createHmac("sha256", AUTH_SECRET).update(malformedBody).digest("base64url");
    expect(readSessionToken(`${malformedBody}.${malformedSignature}`)).toBeNull();

    const expiredPayload = Buffer.from(JSON.stringify({ userId: "demo-user", sessionId: "expired-session", expiresAt: Date.now() - 1000 })).toString("base64url");
    const expiredSignature = createHmac("sha256", AUTH_SECRET).update(expiredPayload).digest("base64url");
    expect(readSessionToken(`${expiredPayload}.${expiredSignature}`)).toBeNull();
    expect(readSessionToken("not-a-session-token")).toBeNull();
  });
});
