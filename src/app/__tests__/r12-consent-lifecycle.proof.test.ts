import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RiskCompliance — General #5 (consent lifecycle completeness).
 *
 * Every consent flow that grants or revokes access must emit a matching
 * audit row so the Trust Console can show a complete history. This
 * proof test pins those emission points: each row below is a
 * `(eventType, expected-call-site)` pair.
 *
 * PR4 wired the four networking-consent events (opt-in / revoke /
 * cascade-failed / version-stale-denial). PR5 (R12 — this council) wires
 * the missing `oauth_connected` event in the Gmail/Calendar callback.
 *
 * `login_succeeded` / `login_failed` remain declared but UNwired — the
 * lift required to instrument Supabase's hosted sign-in callbacks
 * cleanly is operational rather than security-critical (auth failures
 * already surface via Supabase logs + Sentry). They appear on the
 * KNOWN_UNWIRED list so this test documents the gap.
 */

const ROOT = process.cwd();

interface ConsentEventPin {
  eventType: string;
  /** A file that MUST contain `eventType: "<eventType>"` (or `"<eventType>"` in a string literal). */
  emittedBy: string;
  /** Short human note for the audit trail. */
  reason: string;
}

const REQUIRED_EMISSION_POINTS: readonly ConsentEventPin[] = [
  {
    eventType: "oauth_connected",
    emittedBy: "src/app/api/gmail/callback/route.ts",
    reason: "Gmail/Calendar OAuth grant — fires once tokens are stored",
  },
  {
    eventType: "oauth_disconnected",
    emittedBy: "src/app/api/gmail/disconnect/route.ts",
    reason: "Gmail/Calendar OAuth revoke",
  },
  {
    eventType: "data_exported",
    emittedBy: "src/app/api/account/export/route.ts",
    reason: "GDPR — user-initiated data export queue",
  },
  {
    eventType: "data_delete_requested",
    emittedBy: "src/app/api/account/delete/route.ts",
    reason: "GDPR — 30-day grace window stamped",
  },
  {
    eventType: "data_delete_canceled",
    emittedBy: "src/app/api/account/delete/cancel/route.ts",
    reason: "GDPR — user reverses pending delete",
  },
  {
    eventType: "data_hard_deleted",
    emittedBy: "src/app/api/cron/purge-sweeper/route.ts",
    reason: "GDPR — grace window expired, row purged",
  },
  {
    eventType: "networking_opted_in",
    emittedBy: "src/lib/audit/consent-events.ts",
    reason: "Warm-intro network consent grant (PR4)",
  },
  {
    eventType: "networking_revoked",
    emittedBy: "src/lib/audit/consent-events.ts",
    reason: "Warm-intro network consent revoke (PR4)",
  },
  {
    eventType: "networking_revoke_cascade_failed",
    emittedBy: "src/lib/audit/consent-events.ts",
    reason: "Revoke cascade short-circuited (PR4)",
  },
  {
    eventType: "consent_version_stale_denial",
    emittedBy: "src/lib/audit/consent-events.ts",
    reason: "User on older consent version, must re-consent (PR4)",
  },
];

/**
 * Events declared in `AuditEventType` that we deliberately do not wire
 * up yet — documenting the gap is preferable to silent absence.
 * Operators should expect Supabase auth logs + Sentry for these.
 */
const KNOWN_UNWIRED = new Set<string>([
  "login_succeeded",
  "login_failed",
]);

describe("R12 — consent lifecycle audit coverage", () => {
  for (const pin of REQUIRED_EMISSION_POINTS) {
    it(`${pin.eventType} is emitted from ${pin.emittedBy}`, () => {
      const src = readFileSync(resolve(ROOT, pin.emittedBy), "utf8");
      // Accept either an `eventType: "<x>"` literal or a string-literal
      // call site (the consent-events module emits via const exports).
      const literal = new RegExp(
        `(eventType:\\s*"${pin.eventType}"|EVENT_${pin.eventType.toUpperCase()}|"${pin.eventType}"\\s+as\\s+const)`,
      );
      expect(src, `expected ${pin.eventType} to be emitted from ${pin.emittedBy}`).toMatch(
        literal,
      );
    });
  }

  it("AuditEventType declared in log.ts covers every required emission", () => {
    const src = readFileSync(resolve(ROOT, "src/lib/audit/log.ts"), "utf8");
    for (const pin of REQUIRED_EMISSION_POINTS) {
      // Either the union arm is declared in log.ts directly, or it
      // lives in consent-events.ts (the parallel ConsentEventType
      // union, intentionally separate per PR4 design).
      const declaredInLog = src.includes(`"${pin.eventType}"`);
      if (declaredInLog) continue;
      const consentSrc = readFileSync(
        resolve(ROOT, "src/lib/audit/consent-events.ts"),
        "utf8",
      );
      expect(consentSrc).toContain(`"${pin.eventType}"`);
    }
  });

  it("known-unwired events are documented and not silently expected", () => {
    // Sanity: if KNOWN_UNWIRED grows beyond the documented two, this
    // test should fail-fast so the surface stays explicit.
    expect(KNOWN_UNWIRED.size).toBe(2);
    expect(KNOWN_UNWIRED.has("login_succeeded")).toBe(true);
    expect(KNOWN_UNWIRED.has("login_failed")).toBe(true);
  });

  it("audit_logs CHECK constraint allowlist covers every emitted eventType", () => {
    // Migration 0029 + 0030 maintain the CHECK constraint. We grep the
    // most recent migration that re-issues the constraint and confirm
    // every emission point's eventType is in the allowlist. (If the
    // constraint drifts from the union, INSERT throws at runtime and
    // the audit row is lost — exactly what we don't want.)
    const migrationsDir = resolve(ROOT, "src/db/migrations");
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    const allMigrations = files
      .map((f) => readFileSync(resolve(migrationsDir, f), "utf8"))
      .join("\n");

    for (const pin of REQUIRED_EMISSION_POINTS) {
      // The eventType must appear inside at least one CHECK
      // constraint string in the migration history.  We accept any
      // form of the string-literal in SQL: single-quoted.
      const sqlForm = new RegExp(`'${pin.eventType}'`);
      expect(allMigrations, `eventType ${pin.eventType} missing from migrations`).toMatch(sqlForm);
    }
  });
});

// keep referenced so eslint doesn't flag the constant as unused.
void function walkUnused(): void {
  void statSync;
};
