/**
 * Tests for the PR4 networking-consent audit helpers.
 *
 * Binds the four event-type strings, the success/failure variants of
 * `recordRevokeCascade`, and the fire-and-forget contract (no throw, ever).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { insertSpy, warnSpy } = vi.hoisted(() => ({
  insertSpy: vi.fn(),
  warnSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ insert: insertSpy }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: warnSpy,
    error: vi.fn(),
  },
}));

const {
  EVENT_NETWORKING_OPTED_IN,
  EVENT_NETWORKING_REVOKED,
  EVENT_NETWORKING_REVOKE_CASCADE_FAILED,
  EVENT_CONSENT_VERSION_STALE_DENIAL,
  logConsentEvent,
  recordRevokeCascade,
} = await import("../consent-events");

describe("consent-events module — event-type string constants", () => {
  it("pins the four event-type strings to the DB CHECK constraint values", () => {
    // Binding test: these strings MUST stay in lockstep with the
    // `audit_logs_event_type_check` allow-list set by migration 0029.
    expect(EVENT_NETWORKING_OPTED_IN).toBe("networking_opted_in");
    expect(EVENT_NETWORKING_REVOKED).toBe("networking_revoked");
    expect(EVENT_NETWORKING_REVOKE_CASCADE_FAILED).toBe(
      "networking_revoke_cascade_failed",
    );
    expect(EVENT_CONSENT_VERSION_STALE_DENIAL).toBe(
      "consent_version_stale_denial",
    );
  });
});

describe("logConsentEvent", () => {
  beforeEach(() => {
    insertSpy.mockReset();
    warnSpy.mockReset();
  });

  it("inserts a row with snake_case columns and the given event_type", async () => {
    insertSpy.mockResolvedValue({ error: null });
    await logConsentEvent({
      userId: "u-1",
      eventType: EVENT_NETWORKING_OPTED_IN,
      metadata: { consent_version: 2 },
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u-1",
        event_type: "networking_opted_in",
        resource_type: null,
        resource_id: null,
        metadata: { consent_version: 2 },
        ip_address: null,
        user_agent: null,
      }),
    );
  });

  it("defaults resourceType/resourceId/metadata when omitted", async () => {
    insertSpy.mockResolvedValue({ error: null });
    await logConsentEvent({
      userId: "u-2",
      eventType: EVENT_CONSENT_VERSION_STALE_DENIAL,
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: null,
        resource_id: null,
        metadata: {},
      }),
    );
  });

  it("never throws when the insert returns an error", async () => {
    insertSpy.mockResolvedValue({ error: { message: "rls denied" } });
    await expect(
      logConsentEvent({
        userId: "u-3",
        eventType: EVENT_NETWORKING_REVOKED,
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "audit_logs.consent_insert_failed",
      expect.objectContaining({ user_id: "u-3", event_type: "networking_revoked" }),
    );
  });

  it("never throws when the admin client itself throws", async () => {
    insertSpy.mockRejectedValue(new Error("boom"));
    await expect(
      logConsentEvent({
        userId: "u-4",
        eventType: EVENT_NETWORKING_REVOKE_CASCADE_FAILED,
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "audit_logs.consent_insert_threw",
      expect.objectContaining({ user_id: "u-4" }),
    );
  });
});

describe("recordRevokeCascade", () => {
  beforeEach(() => {
    insertSpy.mockReset();
    warnSpy.mockReset();
    insertSpy.mockResolvedValue({ error: null });
  });

  it("writes a networking_revoked row on success with structured metadata", async () => {
    await recordRevokeCascade({
      userId: "u-1",
      itemsErased: 5,
      tablesTouched: ["user_profiles", "networking_match_index", "match_candidate_index"],
      durationMs: 87,
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u-1",
        event_type: "networking_revoked",
        metadata: {
          items_erased: 5,
          tables_touched: [
            "user_profiles",
            "networking_match_index",
            "match_candidate_index",
          ],
          duration_ms: 87,
        },
      }),
    );
  });

  it("writes a networking_revoke_cascade_failed row on failure with a sanitized error_code", async () => {
    await recordRevokeCascade({
      userId: "u-2",
      itemsErased: 1,
      tablesTouched: ["user_profiles"],
      durationMs: 42,
      // Raw error mentions "constraint" → maps to constraint_violation.
      error: "violates check constraint foo_bar",
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u-2",
        event_type: "networking_revoke_cascade_failed",
        metadata: {
          items_erased: 1,
          tables_touched: ["user_profiles"],
          duration_ms: 42,
          error_code: "constraint_violation",
        },
      }),
    );
  });

  it("supplies defaults for itemsErased/tablesTouched when failure omits them", async () => {
    await recordRevokeCascade({
      userId: "u-3",
      durationMs: 12,
      error: "stamp broken",
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "networking_revoke_cascade_failed",
        metadata: {
          items_erased: 0,
          tables_touched: [],
          duration_ms: 12,
          error_code: "cascade_failed",
        },
      }),
    );
  });

  it("never throws even if the underlying insert rejects", async () => {
    insertSpy.mockRejectedValue(new Error("network down"));
    await expect(
      recordRevokeCascade({
        userId: "u-4",
        itemsErased: 0,
        tablesTouched: [],
        durationMs: 1,
      }),
    ).resolves.toBeUndefined();
  });
});
