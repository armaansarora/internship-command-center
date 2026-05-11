import { describe, it, expect } from "vitest";
import { hashCustomerEmail } from "./pii";

describe("hashCustomerEmail", () => {
  it("returns null for null / undefined / empty / whitespace input", () => {
    expect(hashCustomerEmail(null)).toBeNull();
    expect(hashCustomerEmail(undefined)).toBeNull();
    expect(hashCustomerEmail("")).toBeNull();
    expect(hashCustomerEmail("   ")).toBeNull();
  });

  it("returns a sha256:<64-hex-char> string for a normal email", () => {
    const result = hashCustomerEmail("user@example.com");
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("is case- and whitespace-normalized (same input → same hash)", () => {
    const a = hashCustomerEmail("User@Example.COM");
    const b = hashCustomerEmail("  user@example.com  ");
    const c = hashCustomerEmail("user@example.com");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("produces different hashes for different emails", () => {
    const a = hashCustomerEmail("alice@example.com");
    const b = hashCustomerEmail("bob@example.com");
    expect(a).not.toBe(b);
  });

  it("never contains the original plaintext", () => {
    const result = hashCustomerEmail("secret-buyer@interntower.com");
    expect(result).not.toMatch(/secret-buyer/);
    expect(result).not.toMatch(/interntower/);
  });
});
