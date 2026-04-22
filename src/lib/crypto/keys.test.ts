import { describe, it, expect } from "vitest";
import { deriveUserKey } from "./keys";

describe("deriveUserKey", () => {
  it("returns 32 bytes", () => {
    const k = deriveUserKey("user-1", Buffer.alloc(32, 0xab));
    expect(k.length).toBe(32);
  });

  it("different users get different keys from the same master", () => {
    const master = Buffer.alloc(32, 0xab);
    const a = deriveUserKey("user-a", master);
    const b = deriveUserKey("user-b", master);
    expect(a.equals(b)).toBe(false);
  });

  it("same user + master is deterministic", () => {
    const master = Buffer.alloc(32, 0xab);
    const a = deriveUserKey("user-x", master);
    const b = deriveUserKey("user-x", master);
    expect(a.equals(b)).toBe(true);
  });

  it("different masters produce different keys for the same user", () => {
    const a = deriveUserKey("user-x", Buffer.alloc(32, 0xaa));
    const b = deriveUserKey("user-x", Buffer.alloc(32, 0xbb));
    expect(a.equals(b)).toBe(false);
  });
});
