import { describe, expect, it } from "vitest";
import { assertOwner } from "@/lib/auth";

describe("authorization helpers", () => {
  it("blocks cross-user access", () => {
    expect(() => assertOwner("user-a", "user-b")).toThrow("FORBIDDEN");
  });
});
