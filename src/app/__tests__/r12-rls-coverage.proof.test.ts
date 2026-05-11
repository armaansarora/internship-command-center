import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RiskCompliance — General #1 (RLS coverage on every table).
 *
 * Every `pgTable("name", …)` declaration in src/db/schema.ts must either:
 *
 *   1. Carry a `userIsolation("name")` policy (the standard
 *      `auth.uid() = user_id` posture), OR
 *   2. Carry a hand-rolled `pgPolicy(...)` block (e.g. self-access on
 *      `user_profiles`, SELECT-only on `outreach_queue`), OR
 *   3. Appear on the SERVICE_ROLE_ONLY list below — these tables
 *      have NO Drizzle-defined policy by design. They are reachable
 *      only by the service-role admin client which bypasses RLS, AND
 *      the migration MUST either REVOKE from anon/authenticated OR
 *      install a deny-policy.
 *
 * The point of this test: schema.ts is one human-edited file. A future
 * change that adds a table without an RLS posture, or that flips a
 * service-role-only table to expose it to clients, fails fast here.
 */

const HAND_ROLLED_POLICY = new Set<string>([
  // pgPolicy("user_profiles_self_access") — `auth.uid() = id`.
  "user_profiles",
  // pgPolicy("outreach_queue_user_select") — SELECT only since 0025.
  "outreach_queue",
  // pgPolicy("audit_logs_self_read") — SELECT only; writes service-role.
  "audit_logs",
  // pgPolicy "comp_bands_read" in migration 0020 — read-only to ALL
  // authenticated users (shared Levels.fyi cache). No Drizzle policy
  // because Drizzle has no native way to express role-based reads.
  "company_comp_bands",
]);

interface ServiceRoleOnly {
  /** Migration that ENABLES RLS and either REVOKEs or installs a deny-policy. */
  migration: string;
  /** Human rationale captured at audit time. */
  reason: string;
}

const SERVICE_ROLE_ONLY: Record<string, ServiceRoleOnly> = {
  // Stripe webhook idempotency.  Hardened by 0033 (RiskCompliance) to
  // add explicit REVOKE so the posture isn't relying on default-deny.
  stripe_webhook_events: {
    migration: "src/db/migrations/0033_service_role_only_revokes.sql",
    reason: "webhook idempotency cache; client reads/writes denied",
  },
  // Firecrawl monthly budget counter.  Hardened by 0033.
  comp_bands_budget: {
    migration: "src/db/migrations/0033_service_role_only_revokes.sql",
    reason: "monthly scrape-credit budget; never client-readable",
  },
  // Lighthouse Watchdog incident state machine.  Migration 0036 mirrors
  // the stripe_webhook_events / comp_bands_budget posture — RLS enabled
  // without a policy, plus explicit REVOKE FROM anon, authenticated so a
  // future grant cannot quietly expose owner-only operational data.
  incident_alerts: {
    migration: "src/db/migrations/0036_incident_alerts.sql",
    reason: "watchdog incident state; owner-only diagnostics, service-role",
  },
};

describe("R12 — RLS coverage", () => {
  const schemaSrc = readFileSync(
    resolve(process.cwd(), "src/db/schema.ts"),
    "utf8",
  );

  function discoverTables(): string[] {
    const matches = Array.from(schemaSrc.matchAll(/pgTable\("([a-z_]+)"/g));
    return matches.map((m) => m[1]);
  }

  it("every pgTable has userIsolation, a hand-rolled policy, or a service-role-only entry", () => {
    const tables = discoverTables();
    const unprotected: string[] = [];

    for (const table of tables) {
      if (schemaSrc.includes(`userIsolation("${table}")`)) continue;
      if (HAND_ROLLED_POLICY.has(table)) continue;
      if (table in SERVICE_ROLE_ONLY) continue;
      unprotected.push(table);
    }

    expect(unprotected).toEqual([]);
  });

  it("every SERVICE_ROLE_ONLY table denies anon AND authenticated via REVOKE or deny-policy", () => {
    const issues: Array<{ table: string; missing: string }> = [];
    const migrationsDir = resolve(process.cwd(), "src/db/migrations");
    const allMigrations = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(resolve(migrationsDir, f), "utf8"))
      .join("\n");

    for (const [table, meta] of Object.entries(SERVICE_ROLE_ONLY)) {
      // The named migration must exist + mention the table.
      let migration: string;
      try {
        migration = readFileSync(resolve(process.cwd(), meta.migration), "utf8");
      } catch {
        issues.push({ table, missing: `migration ${meta.migration} not found` });
        continue;
      }
      if (!migration.toLowerCase().includes(table.toLowerCase())) {
        issues.push({
          table,
          missing: `migration ${meta.migration} does not mention table`,
        });
        continue;
      }

      // ANY migration in the chain must REVOKE or deny.  We search across
      // the full migration history rather than only the named one so the
      // test tolerates revokes being added in a later hardening pass.
      const lower = allMigrations.toLowerCase();
      const tbl = table.toLowerCase();
      const revokesAnon =
        new RegExp(`revoke all on (public\\.)?"?${tbl}"? from anon`).test(lower) ||
        new RegExp(`policy[^;]*${tbl}[^;]*to anon[^;]*using \\(false\\)`).test(lower) ||
        new RegExp(`policy[^;]*${tbl}[^;]*to anon[^;]*with check \\(false\\)`).test(lower);
      const revokesAuthenticated =
        new RegExp(`revoke all on (public\\.)?"?${tbl}"? from authenticated`).test(lower) ||
        new RegExp(
          `policy[^;]*${tbl}[^;]*(to authenticated|to anon, authenticated)[^;]*using \\(false\\)`,
        ).test(lower) ||
        new RegExp(
          `policy[^;]*${tbl}[^;]*(to authenticated|to anon, authenticated)[^;]*with check \\(false\\)`,
        ).test(lower);

      if (!revokesAnon) issues.push({ table, missing: "no REVOKE/deny from anon" });
      if (!revokesAuthenticated) {
        issues.push({ table, missing: "no REVOKE/deny from authenticated" });
      }
    }

    expect(issues).toEqual([]);
  });

  it("audit_logs has self_read only — no INSERT/UPDATE/DELETE client policy", () => {
    const idx = schemaSrc.indexOf('pgTable("audit_logs"');
    expect(idx).toBeGreaterThan(-1);
    const block = schemaSrc.slice(idx, idx + 2_000);
    expect(block).toMatch(/pgPolicy\("audit_logs_self_read"/);
    expect(block).not.toMatch(/for:\s*"insert"/);
    expect(block).not.toMatch(/for:\s*"update"/);
    expect(block).not.toMatch(/for:\s*"delete"/);
  });

  it("outreach_queue downgraded to SELECT-only since security remediation 0025", () => {
    // 0025 dropped the all-action user_isolation policy and installed
    // `outreach_queue_user_select`. The schema must reflect that —
    // re-introducing userIsolation here would re-open client writes to
    // the cron-fed queue.
    expect(schemaSrc).not.toMatch(/userIsolation\("outreach_queue"\)/);
    expect(schemaSrc).toMatch(/pgPolicy\("outreach_queue_user_select"/);
  });

  it("engagement_events is service-role-only with REVOKE in migration 0026", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "src/db/migrations/0026_engagement_events.sql"),
      "utf8",
    );
    expect(migration).toMatch(/ALTER TABLE public\.engagement_events ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/REVOKE ALL ON public\.engagement_events FROM anon/);
    expect(migration).toMatch(/REVOKE ALL ON public\.engagement_events FROM authenticated/);
    expect(migration).not.toMatch(/CREATE POLICY[^;]+engagement_events[^;]+TO anon/);
    expect(migration).not.toMatch(/CREATE POLICY[^;]+engagement_events[^;]+TO authenticated/);
  });

  it("waitlist_signups is service-role-only with deny policy (0023)", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "src/db/migrations/0023_launch_prep.sql"),
      "utf8",
    );
    expect(migration).toMatch(
      /create policy waitlist_signups_no_anon[\s\S]+to anon, authenticated[\s\S]+using \(false\)/,
    );
    expect(migration).toMatch(/with check \(false\)/);
  });
});
