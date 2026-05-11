import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RiskCompliance — General #2 (secret blast radius).
 *
 * Two invariants pinned by this proof:
 *
 * (A) The "fallback chain" for each runtime secret is the allowlist
 *     below. Secrets must NEVER pick up additional fallbacks (e.g.
 *     a new module deciding to also accept `STRIPE_WEBHOOK_SECRET`
 *     as a substitute for `OAUTH_STATE_SECRET`) without an explicit
 *     allowlist edit. The whole point: the blast radius of any one
 *     leaked secret is finite and auditable.
 *
 * (B) Every secret that appears in env.ts has at most ONE service
 *     scope. The schema must not reuse a single env var name for
 *     two unrelated purposes.
 *
 * Tests are static-source greps so they run without a live env.
 */

const ROOT = process.cwd();
const ENV_TS = readFileSync(resolve(ROOT, "src/lib/env.ts"), "utf8");

/**
 * Documented fallback chains. Format:
 *   "<consumer-file>": ["primary-env-var", "fallback-env-var", ...]
 *
 * Adding/removing a fallback here is a security-review event. Both
 * `env.ENCRYPTION_KEY` chains below are coupled by design — see the
 * docstring in `getSecret()` for the rationale.
 */
const FALLBACK_CHAINS: Record<string, readonly string[]> = {
  "src/lib/auth/oauth-state.ts": ["OAUTH_STATE_SECRET", "ENCRYPTION_KEY"],
  "src/lib/auth/google-login-state.ts": ["OAUTH_STATE_SECRET", "ENCRYPTION_KEY"],
};

describe("R12 — secret blast radius", () => {
  it("every documented fallback chain is exactly the env vars listed below", () => {
    for (const [file, expected] of Object.entries(FALLBACK_CHAINS)) {
      const src = readFileSync(resolve(ROOT, file), "utf8");

      // Pull every `e.<NAME>` reference where NAME matches an env var
      // already declared in env.ts. Order is preserved.
      const found: string[] = [];
      const re = /\be\.([A-Z][A-Z0-9_]+)\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const name = m[1];
        if (!ENV_TS.includes(name)) continue;
        // De-duplicate preserving order — multiple references to the
        // same var don't extend the chain.
        if (!found.includes(name)) found.push(name);
      }

      expect(found, `file ${file}`).toEqual(expected);
    }
  });

  it("no library file outside the allowlist references both ENCRYPTION_KEY and OAUTH_STATE_SECRET", () => {
    // Any file that touches BOTH names must either be:
    //   - in the allowlist above
    //   - or be the env.ts schema itself.
    const allowlist = new Set<string>([
      ...Object.keys(FALLBACK_CHAINS),
      "src/lib/env.ts",
    ]);
    const offenders: string[] = [];
    for (const file of walk("src", [".ts", ".tsx"])) {
      if (/__tests__|\.test\.|\.spec\./.test(file)) continue;
      if (allowlist.has(file)) continue;
      const src = readFileSync(resolve(ROOT, file), "utf8");
      if (
        src.includes("ENCRYPTION_KEY") &&
        src.includes("OAUTH_STATE_SECRET")
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("env.ts does NOT declare the same env var twice", () => {
    // Pull every `<NAME>: z.` declaration; ensure each is unique.
    const names = Array.from(ENV_TS.matchAll(/^\s*([A-Z][A-Z0-9_]+):\s*z\./gm)).map(
      (mm) => mm[1],
    );
    const counts: Record<string, number> = {};
    for (const n of names) counts[n] = (counts[n] ?? 0) + 1;
    const dupes = Object.entries(counts).filter(([, c]) => c > 1).map(([n]) => n);
    expect(dupes).toEqual([]);
  });

  it("MATCH_ANON_SECRET is declared in env.ts and the .env.example", () => {
    expect(ENV_TS).toMatch(/MATCH_ANON_SECRET:\s*z\.string\(\)/);
    const envExample = readFileSync(resolve(ROOT, ".env.example"), "utf8");
    expect(envExample).toMatch(/^MATCH_ANON_SECRET=/m);
  });

  it("getSupabaseAdmin is the ONLY runtime consumer of SUPABASE_SERVICE_ROLE_KEY", () => {
    // Service-role compromise = god-mode over RLS. We pin the runtime
    // surface so a future PR cannot quietly add a second
    // `createClient(url, SUPABASE_SERVICE_ROLE_KEY, …)` somewhere.
    // beta-gate.ts references it for a "feature available?" check, NOT
    // as a client constructor — we accept that as a documented exception.
    const allowlist = new Set<string>([
      "src/lib/supabase/admin.ts", // sole client constructor
      "src/lib/auth/beta-gate.ts", // availability check, no client built
      "src/lib/env.ts", // schema
    ]);
    const offenders: string[] = [];
    for (const file of walk("src", [".ts", ".tsx"])) {
      if (/__tests__|\.test\.|\.spec\./.test(file)) continue;
      if (allowlist.has(file)) continue;
      const src = readFileSync(resolve(ROOT, file), "utf8");
      if (src.includes("SUPABASE_SERVICE_ROLE_KEY")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("ENCRYPTION_KEY consumers are limited to the documented modules", () => {
    // Two purposes: AES-GCM tokens at rest (gmail/oauth.ts) and the
    // documented OAuth-state HMAC fallback (the two state modules).
    const allowlist = new Set<string>([
      "src/lib/gmail/oauth.ts", // primary purpose: AES-GCM master
      "src/lib/auth/oauth-state.ts", // documented fallback
      "src/lib/auth/google-login-state.ts", // documented fallback
      "src/lib/env.ts", // schema
    ]);
    const offenders: string[] = [];
    for (const file of walk("src", [".ts", ".tsx"])) {
      if (/__tests__|\.test\.|\.spec\./.test(file)) continue;
      if (allowlist.has(file)) continue;
      const src = readFileSync(resolve(ROOT, file), "utf8");
      if (src.includes("ENCRYPTION_KEY")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

function walk(dir: string, exts: readonly string[]): string[] {
  const out: string[] = [];
  function recur(d: string): void {
    let entries: string[] = [];
    try {
      entries = readdirSync(resolve(ROOT, d));
    } catch {
      return;
    }
    for (const name of entries) {
      const rel = `${d}/${name}`;
      let stat;
      try {
        stat = statSync(resolve(ROOT, rel));
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === ".next") continue;
        recur(rel);
      } else if (exts.some((e) => rel.endsWith(e))) {
        out.push(rel);
      }
    }
  }
  recur(dir);
  return out;
}
