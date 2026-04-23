/**
 * R4.3 — extraction module tests.
 *
 * Covers the skip placeholder path (which does NOT call the LLM) — that's
 * the deterministic branch we can unit-test in isolation. The
 * conversation-path extraction is exercised end-to-end by the R4.11 Proof
 * test (with fixture transcripts) against a real Anthropic model in CI.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the persistence layer — we only want to verify the shape of the
// placeholder profile here. The actual Supabase writes are covered by the
// Proof test.
vi.mock("@/lib/agents/cro/target-profile", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/agents/cro/target-profile")>();
  return {
    ...actual,
    upsertTargetProfile: vi.fn().mockResolvedValue({
      profile: {} as Record<string, unknown>,
      embedding: null,
      updatedAt: new Date().toISOString(),
      rowId: "test-row-id",
    }),
  };
});

vi.mock("@/lib/db/queries/user-profiles-rest", () => ({
  saveConciergeProfile: vi.fn().mockResolvedValue({
    ok: true,
    completedAt: "2026-04-23T10:00:00.000Z",
  }),
}));

// The logger pokes env.ts on warn paths — mock it so the "skip failed"
// branch doesn't trip env validation. Real logging is covered elsewhere.
vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { persistSkipPlaceholderProfile } from "./extract";
import { TargetProfileSchema } from "@/lib/agents/cro/target-profile";
import { upsertTargetProfile } from "@/lib/agents/cro/target-profile";
import { saveConciergeProfile } from "@/lib/db/queries/user-profiles-rest";

describe("R4.3 persistSkipPlaceholderProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a TargetProfileSchema-valid placeholder on skip", async () => {
    const result = await persistSkipPlaceholderProfile("user-123");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("skip");
    // Placeholder must parse cleanly — if TargetProfileSchema changes
    // incompatibly, this catches it.
    expect(() => TargetProfileSchema.parse(result!.profile)).not.toThrow();
  });

  it("placeholder has usable defaults (roles non-empty, geos non-empty)", async () => {
    const result = await persistSkipPlaceholderProfile("user-123");
    expect(result!.profile.roles.length).toBeGreaterThan(0);
    expect(result!.profile.geos.length).toBeGreaterThan(0);
  });

  it("writes to both the agent_memory upsert and the user_profiles mirror", async () => {
    await persistSkipPlaceholderProfile("user-abc");
    expect(upsertTargetProfile).toHaveBeenCalledWith(
      "user-abc",
      expect.objectContaining({ roles: expect.any(Array) }),
    );
    expect(saveConciergeProfile).toHaveBeenCalledWith(
      "user-abc",
      expect.objectContaining({ roles: expect.any(Array) }),
    );
  });

  it("returns null if the canonical upsert fails", async () => {
    vi.mocked(upsertTargetProfile).mockResolvedValueOnce(null);
    const result = await persistSkipPlaceholderProfile("user-xyz");
    expect(result).toBeNull();
  });
});
