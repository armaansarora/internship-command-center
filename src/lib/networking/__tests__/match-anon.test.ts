import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("counterpartyAnonKey", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MATCH_ANON_SECRET", "test-secret-32-bytes-minimum-length-ok-padding");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is deterministic for the same contact id", async () => {
    const { counterpartyAnonKey } = await import("../match-anon");
    expect(counterpartyAnonKey("c-1")).toBe(counterpartyAnonKey("c-1"));
  });

  it("produces different keys for different contacts", async () => {
    const { counterpartyAnonKey } = await import("../match-anon");
    expect(counterpartyAnonKey("c-1")).not.toBe(counterpartyAnonKey("c-2"));
  });

  it("returns a 64-char hex string (sha256)", async () => {
    const { counterpartyAnonKey } = await import("../match-anon");
    const key = counterpartyAnonKey("c-1");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws fail-closed when MATCH_ANON_SECRET is empty", async () => {
    vi.stubEnv("MATCH_ANON_SECRET", "");
    vi.resetModules();
    const { counterpartyAnonKey } = await import("../match-anon");
    expect(() => counterpartyAnonKey("c-1")).toThrow(/MATCH_ANON_SECRET/);
  });

  it("throws fail-closed when MATCH_ANON_SECRET is unset", async () => {
    vi.stubEnv("MATCH_ANON_SECRET", undefined as unknown as string);
    vi.resetModules();
    const { counterpartyAnonKey } = await import("../match-anon");
    expect(() => counterpartyAnonKey("c-1")).toThrow(/MATCH_ANON_SECRET/);
  });
});
