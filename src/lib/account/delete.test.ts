import { describe, it, expect } from "vitest";
import {
  GRACE_WINDOW_DAYS,
  GRACE_WINDOW_MS,
  PURGE_BATCH_LIMIT,
  hashEmailForTombstone,
  scheduledPurgeAt,
  isWithinCancelWindow,
  purgeCutoffIso,
} from "./delete";

describe("account/delete helpers", () => {
  describe("constants", () => {
    it("exposes a 30-day grace window and a 10-row batch limit", () => {
      expect(GRACE_WINDOW_DAYS).toBe(30);
      expect(PURGE_BATCH_LIMIT).toBe(10);
      expect(GRACE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe("hashEmailForTombstone", () => {
    it("produces a 16-char lowercase hex digest", () => {
      const digest = hashEmailForTombstone("alice@example.com");
      expect(digest).toMatch(/^[0-9a-f]{16}$/);
    });

    it("is deterministic for the same input", () => {
      const a = hashEmailForTombstone("bob@example.com");
      const b = hashEmailForTombstone("bob@example.com");
      expect(a).toBe(b);
    });

    it("differs for different emails (no collision on common case)", () => {
      const a = hashEmailForTombstone("alice@example.com");
      const b = hashEmailForTombstone("bob@example.com");
      expect(a).not.toBe(b);
    });

    it("never returns the raw email", () => {
      const email = "leaky@example.com";
      const digest = hashEmailForTombstone(email);
      expect(digest).not.toContain("leaky");
      expect(digest).not.toContain("@");
    });
  });

  describe("scheduledPurgeAt", () => {
    it("returns deletedAt + 30 days as ISO string", () => {
      const deletedAt = "2026-01-01T00:00:00.000Z";
      const purgeAt = scheduledPurgeAt(deletedAt);
      expect(purgeAt).toBe("2026-01-31T00:00:00.000Z");
    });

    it("round-trips through Date without losing precision", () => {
      const deletedAt = new Date("2026-04-22T20:41:00.000Z").toISOString();
      const purgeAt = scheduledPurgeAt(deletedAt);
      const delta = new Date(purgeAt).getTime() - new Date(deletedAt).getTime();
      expect(delta).toBe(GRACE_WINDOW_MS);
    });
  });

  describe("isWithinCancelWindow", () => {
    const deletedAt = "2026-04-01T00:00:00.000Z";
    const deletedMs = new Date(deletedAt).getTime();

    it("true at the exact moment of soft-delete", () => {
      expect(isWithinCancelWindow(deletedAt, deletedMs)).toBe(true);
    });

    it("true one millisecond before the window closes", () => {
      expect(isWithinCancelWindow(deletedAt, deletedMs + GRACE_WINDOW_MS - 1)).toBe(true);
    });

    it("true on the boundary (inclusive)", () => {
      expect(isWithinCancelWindow(deletedAt, deletedMs + GRACE_WINDOW_MS)).toBe(true);
    });

    it("false one millisecond after the window closes", () => {
      expect(isWithinCancelWindow(deletedAt, deletedMs + GRACE_WINDOW_MS + 1)).toBe(false);
    });

    it("false when deleted_at is garbage", () => {
      expect(isWithinCancelWindow("not-a-date")).toBe(false);
    });
  });

  describe("purgeCutoffIso", () => {
    it("returns now - 30 days", () => {
      const now = new Date("2026-05-01T00:00:00.000Z").getTime();
      expect(purgeCutoffIso(now)).toBe("2026-04-01T00:00:00.000Z");
    });

    it("rows deleted before cutoff are eligible; after are not", () => {
      const now = new Date("2026-05-01T00:00:00.000Z").getTime();
      const cutoff = purgeCutoffIso(now);

      // A soft-delete 31 days ago → before cutoff → eligible.
      const oldDeletion = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();
      expect(oldDeletion < cutoff).toBe(true);

      // A soft-delete 29 days ago → after cutoff → still in grace window.
      const recentDeletion = new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString();
      expect(recentDeletion > cutoff).toBe(true);
    });
  });
});
