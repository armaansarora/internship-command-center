import { describe, it, expect } from "vitest";
import { toNotificationEntityId } from "../notifications-rest";

/**
 * `notifications.source_entity_id` is a `uuid` column. Several crons pass
 * non-UUID idempotency strings (e.g. `cooling-<id>-w<week>`), which silently
 * failed the insert before coercion. These tests pin the contract that makes
 * those inserts succeed while staying a stable idempotency key.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("toNotificationEntityId", () => {
  it("passes a real UUID through unchanged", () => {
    const u = "44444444-4444-4444-8444-444444444444";
    expect(toNotificationEntityId(u)).toBe(u);
  });

  it("coerces a non-UUID idempotency string into a well-formed UUID", () => {
    const out = toNotificationEntityId("cooling-abc-w2900");
    expect(out).toMatch(UUID_RE);
  });

  it("is deterministic — same input yields the same UUID (idempotency key)", () => {
    const a = toNotificationEntityId("cfo-threshold-user-1-w2900");
    const b = toNotificationEntityId("cfo-threshold-user-1-w2900");
    expect(a).toBe(b);
  });

  it("distinguishes different idempotency keys (e.g. different week buckets)", () => {
    const w1 = toNotificationEntityId("cfo-threshold-user-1-w2900");
    const w2 = toNotificationEntityId("cfo-threshold-user-1-w2901");
    expect(w1).not.toBe(w2);
    expect(w1).toMatch(UUID_RE);
    expect(w2).toMatch(UUID_RE);
  });
});
