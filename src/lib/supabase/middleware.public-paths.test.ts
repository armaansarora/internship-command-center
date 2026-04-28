/**
 * Public-path matcher unit tests (security finding F-7).
 *
 * The original middleware used `publicPaths.some(p => pathname.startsWith(p))`,
 * which silently auth-bypassed any future route that *began* with a public
 * prefix string — `/lobbyhack`, `/api/cronfig`, `/termsfake`. This suite locks
 * in the new explicit exact/prefix semantics so the footgun stays disarmed.
 */
import { describe, it, expect } from "vitest";

// Required by middleware.ts top-level requireEnv() reads when imported.
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

import { isPathPublic } from "./middleware";

describe("isPathPublic — exact paths", () => {
  it("matches /terms exactly", () => {
    expect(isPathPublic("/terms")).toBe(true);
  });

  it("rejects /termsfake (no longer auth-bypasses)", () => {
    expect(isPathPublic("/termsfake")).toBe(false);
  });

  it("rejects /terms-and-conditions", () => {
    expect(isPathPublic("/terms-and-conditions")).toBe(false);
  });

  it("rejects nested /terms/anything", () => {
    expect(isPathPublic("/terms/anything")).toBe(false);
  });

  it("matches /privacy exactly", () => {
    expect(isPathPublic("/privacy")).toBe(true);
  });

  it("rejects /privacyhack", () => {
    expect(isPathPublic("/privacyhack")).toBe(false);
  });

  it("matches /pricing exactly", () => {
    expect(isPathPublic("/pricing")).toBe(true);
  });

  it("rejects /pricinghack", () => {
    expect(isPathPublic("/pricinghack")).toBe(false);
  });

  it("matches /waitlist exactly", () => {
    expect(isPathPublic("/waitlist")).toBe(true);
  });

  it("rejects /waitlistleak", () => {
    expect(isPathPublic("/waitlistleak")).toBe(false);
  });

  it("matches /api/auth/callback exactly", () => {
    expect(isPathPublic("/api/auth/callback")).toBe(true);
  });

  it("rejects /api/auth/callbackhack", () => {
    expect(isPathPublic("/api/auth/callbackhack")).toBe(false);
  });

  it("rejects /api/auth/callback/extra", () => {
    expect(isPathPublic("/api/auth/callback/extra")).toBe(false);
  });

  it("matches /api/stripe/webhook exactly", () => {
    expect(isPathPublic("/api/stripe/webhook")).toBe(true);
  });

  it("rejects /api/stripe/webhookhack", () => {
    expect(isPathPublic("/api/stripe/webhookhack")).toBe(false);
  });

  it("matches /api/waitlist exactly", () => {
    expect(isPathPublic("/api/waitlist")).toBe(true);
  });

  it("rejects /api/waitlistdrip", () => {
    expect(isPathPublic("/api/waitlistdrip")).toBe(false);
  });
});

describe("isPathPublic — prefix paths", () => {
  it("matches /lobby exactly", () => {
    expect(isPathPublic("/lobby")).toBe(true);
  });

  it("matches /lobby/onboarding (real sub-route)", () => {
    expect(isPathPublic("/lobby/onboarding")).toBe(true);
  });

  it("matches /lobby/anything/deep", () => {
    expect(isPathPublic("/lobby/anything/deep")).toBe(true);
  });

  it("rejects /lobbyhack (no longer bypasses)", () => {
    expect(isPathPublic("/lobbyhack")).toBe(false);
  });

  it("rejects /lobby-fake", () => {
    expect(isPathPublic("/lobby-fake")).toBe(false);
  });

  it("matches /api/cron exactly", () => {
    expect(isPathPublic("/api/cron")).toBe(true);
  });

  it("matches /api/cron/sync (real cron job)", () => {
    expect(isPathPublic("/api/cron/sync")).toBe(true);
  });

  it("matches /api/cron/cfo-threshold", () => {
    expect(isPathPublic("/api/cron/cfo-threshold")).toBe(true);
  });

  it("rejects /api/cronfake", () => {
    expect(isPathPublic("/api/cronfake")).toBe(false);
  });

  it("rejects /api/cronfig", () => {
    expect(isPathPublic("/api/cronfig")).toBe(false);
  });

  it("matches /api/webhooks exactly", () => {
    expect(isPathPublic("/api/webhooks")).toBe(true);
  });

  it("matches /api/webhooks/anything", () => {
    expect(isPathPublic("/api/webhooks/anything")).toBe(true);
  });

  it("rejects /api/webhookshack", () => {
    expect(isPathPublic("/api/webhookshack")).toBe(false);
  });
});

describe("isPathPublic — non-public routes stay private", () => {
  it("rejects /penthouse", () => {
    expect(isPathPublic("/penthouse")).toBe(false);
  });

  it("rejects /api/ceo/dispatches", () => {
    expect(isPathPublic("/api/ceo/dispatches")).toBe(false);
  });

  it("rejects /settings", () => {
    expect(isPathPublic("/settings")).toBe(false);
  });

  it("rejects root /", () => {
    expect(isPathPublic("/")).toBe(false);
  });
});
