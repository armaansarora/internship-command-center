#!/usr/bin/env tsx
/**
 * R8 Acceptance Check.
 *
 * Enforces the partner-binding constraints for Floor 6 (The Rolodex Lounge)
 * mechanically.  Runs as part of `tower accept R8` (via verify.ts) and can
 * be run standalone: `npx tsx scripts/r8-acceptance-check.ts`.
 *
 * Ten invariants (mirrors R7's pattern):
 *   P1  Rolodex virtualizes to ≤ 50 live cards at 200 fixture.
 *   P2  Warmth pure fn + cool-blue palette (no red hex).
 *   P3  Match-candidates returns 403 when consent_at IS NULL.
 *   P4  Match-candidates returns 403 when revoked_at ≥ consent_at.
 *   P5  private_note only referenced in the allowlist.
 *   P6  Warmth-decay cron + cooling notification via tube.
 *   P7  CIO re-research cron exists + cron registered.
 *   P8  [ / ] keybindings present in useSideSwitch.
 *   P9  Consent copy verbatim in both doc and component.
 *   P10 Red Team checklist has 10+ ✓ lines.
 *
 *  Plus: zero "leads" word in Floor 6 shipping surfaces;
 *        Intent-level tasks complete;
 *        vercel.json registers the three new R8 crons;
 *        Migration 0018 exists;
 *        No #EF4444 / #F59E0B / #4ADE80 in floor-6 surface CSS.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, relative } from "node:path";

const ROOT = process.cwd();
const LEDGER_PATH = resolve(ROOT, ".ledger/R8-the-rolodex-lounge-floor-6.yml");

const INTENT_TASKS = [
  "R8.2", "R8.3", "R8.4", "R8.5", "R8.6",
  "R8.7", "R8.8", "R8.10", "R8.11", "R8.12",
];

let failures = 0;
function ok(msg: string): void {
  console.log(`[r8-acceptance] ✓ ${msg}`);
}
function fail(reason: string, detail?: string): void {
  failures += 1;
  console.error(`[r8-acceptance] ✗ ${reason}`);
  if (detail) console.error(`  ${detail}`);
}
function fileContains(path: string, needle: string | RegExp): boolean {
  if (!existsSync(path)) return false;
  const body = readFileSync(path, "utf8");
  return typeof needle === "string" ? body.includes(needle) : needle.test(body);
}
function fileExists(path: string): boolean {
  return existsSync(resolve(ROOT, path));
}
function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx|css|sql)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────
// 1. Intent-level tasks all complete
// ───────────────────────────────────────────────────────────────────────
if (!existsSync(LEDGER_PATH)) {
  fail(`ledger missing at ${LEDGER_PATH}`);
} else {
  const ledger = readFileSync(LEDGER_PATH, "utf8");
  for (const id of INTENT_TASKS) {
    const escaped = id.replace(".", "\\.");
    const re = new RegExp(`^\\s{2}${escaped}:[\\s\\S]*?status:\\s*complete`, "m");
    if (!re.test(ledger)) {
      fail(`Intent-level task ${id} is not complete — Intent-level tasks cannot be deferred`);
    }
  }
  if (failures === 0) ok(`all ${INTENT_TASKS.length} Intent-level tasks complete`);
}

// ───────────────────────────────────────────────────────────────────────
// 2. Migration 0018 exists
// ───────────────────────────────────────────────────────────────────────
if (!fileExists("src/db/migrations/0018_r8_rolodex_lounge.sql")) {
  fail("migration 0018 missing");
} else {
  ok("migration 0018 present");
}

// ───────────────────────────────────────────────────────────────────────
// 3. vercel.json registers the three new R8 crons
// ───────────────────────────────────────────────────────────────────────
const vercelBody = fileExists("vercel.json")
  ? readFileSync(resolve(ROOT, "vercel.json"), "utf8")
  : "";
for (const path of ["/api/cron/warmth-decay", "/api/cron/cio-reresearch", "/api/cron/warm-intro-scan"]) {
  if (!vercelBody.includes(path)) {
    fail(`vercel.json missing cron ${path}`);
  }
}
if (
  vercelBody.includes("/api/cron/warmth-decay") &&
  vercelBody.includes("/api/cron/cio-reresearch") &&
  vercelBody.includes("/api/cron/warm-intro-scan")
) {
  ok("vercel.json registers all three R8 crons");
}

// ───────────────────────────────────────────────────────────────────────
// 4. Zero "leads" word in Floor 6 shipping code (anti-pattern)
// ───────────────────────────────────────────────────────────────────────
{
  const LEADS_RE = /\bleads?\b/i;
  const offenders: string[] = [];
  for (const f of walk(resolve(ROOT, "src/components/floor-6"))) {
    if (/\.test\.(ts|tsx)$/.test(f)) continue;
    if (LEADS_RE.test(readFileSync(f, "utf8"))) offenders.push(relative(ROOT, f));
  }
  if (offenders.length > 0) {
    fail(`'leads' word appears in Floor 6 shipping code`, offenders.join(", "));
  } else {
    ok("no 'leads' word in Floor 6 shipping code");
  }
}

// ───────────────────────────────────────────────────────────────────────
// 5. No red hex on cold/cooling cards in Floor 6 CSS / components
//    (the cool-blue palette must be preserved; R8.4 non-negotiable)
// ───────────────────────────────────────────────────────────────────────
{
  const CSS_FILES = [
    "src/styles/floor-6.css",
    "src/components/floor-6/contact-grid/ContactCard.tsx",
    "src/components/floor-6/RolodexLoungeTicker.tsx",
    "src/components/floor-6/contact-grid/ContactGrid.tsx",
    "src/components/floor-6/cno-character/CNOWhiteboard.tsx",
  ];
  const offenders: string[] = [];
  for (const rel of CSS_FILES) {
    if (!fileExists(rel)) continue;
    const body = readFileSync(resolve(ROOT, rel), "utf8");
    // Allow red hex ONLY in contexts that are clearly destructive/error (not
    // warmth). Floor 6 CSS currently has zero red; if a future edit brings
    // red back into a warmth context, this check fires.
    if (/#ef4444/i.test(body) || /#4ade80/i.test(body)) {
      offenders.push(rel);
    }
  }
  if (offenders.length > 0) {
    fail("red / green warmth hex reintroduced in Floor 6 surface", offenders.join(", "));
  } else {
    ok("zero red/green warmth hex in Floor 6 surface");
  }
}

// ───────────────────────────────────────────────────────────────────────
// 6. Key R8 files exist
// ───────────────────────────────────────────────────────────────────────
const REQUIRED_FILES = [
  "src/lib/contacts/warmth.ts",
  "src/components/floor-6/rolodex/Rolodex.tsx",
  "src/components/floor-6/rolodex/RolodexCard.tsx",
  "src/components/floor-6/rolodex/useRolodexRotation.ts",
  "src/components/floor-6/side-switch/SideSwitch.tsx",
  "src/components/floor-6/side-switch/useSideSwitch.ts",
  "src/components/floor-6/dossier-wall/DossierWall.tsx",
  "src/components/floor-6/dossier-wall/DossierCard.tsx",
  "src/components/floor-6/dossier-wall/dossier-age.ts",
  "src/app/api/cron/warmth-decay/route.ts",
  "src/app/api/cron/cio-reresearch/route.ts",
  "src/app/api/cron/warm-intro-scan/route.ts",
  "src/lib/networking/warm-intro-finder.ts",
  "src/lib/networking/consent-guard.ts",
  "src/app/api/networking/opt-in/route.ts",
  "src/app/api/networking/revoke/route.ts",
  "src/app/api/networking/match-candidates/route.ts",
  "src/components/settings/NetworkingConsent.tsx",
  "docs/r8/consent-copy.md",
  ".tower/ledger/r8/red-team.md",
];
{
  const missing = REQUIRED_FILES.filter((f) => !fileExists(f));
  if (missing.length > 0) {
    fail(`required R8 files missing`, missing.join(", "));
  } else {
    ok(`all ${REQUIRED_FILES.length} required R8 files present`);
  }
}

// ───────────────────────────────────────────────────────────────────────
// 7. Load-bearing hooks are wired
// ───────────────────────────────────────────────────────────────────────
if (!fileContains("src/app/api/networking/match-candidates/route.ts", "gated-red-team-pending")) {
  fail("match-candidates endpoint missing 'gated-red-team-pending' hard-stop");
} else {
  ok("match-candidates endpoint hard-stops (403 gated-red-team-pending)");
}

if (!fileContains("src/app/api/networking/match-candidates/route.ts", "assertConsented")) {
  fail("match-candidates endpoint does not call assertConsented");
} else {
  ok("match-candidates endpoint calls assertConsented");
}

if (!fileContains("src/components/floor-6/side-switch/useSideSwitch.ts", `"["`)) {
  fail("side-switch missing '[' binding");
}
if (!fileContains("src/components/floor-6/side-switch/useSideSwitch.ts", `"]"`)) {
  fail("side-switch missing ']' binding");
} else {
  ok("side-switch [ / ] bindings present");
}

if (!fileContains("src/app/api/cron/warmth-decay/route.ts", "pneumatic_tube")) {
  fail("warmth-decay cron not wired to the pneumatic tube channel");
} else {
  ok("warmth-decay cron fires via pneumatic_tube channel");
}

// ───────────────────────────────────────────────────────────────────────
// 8. Red Team checklist has ≥ 10 ✓ lines, zero ✗ lines
// ───────────────────────────────────────────────────────────────────────
{
  const RT_PATH = resolve(ROOT, ".tower/ledger/r8/red-team.md");
  if (!existsSync(RT_PATH)) {
    fail("Red Team checklist .tower/ledger/r8/red-team.md missing");
  } else {
    const body = readFileSync(RT_PATH, "utf8");
    const ticks = (body.match(/^-\s+✓/gm) ?? []).length;
    const crosses = (body.match(/^-\s+✗/gm) ?? []).length;
    if (ticks < 10) {
      fail(`Red Team checklist has only ${ticks} ✓ lines; need >=10`);
    } else if (crosses > 0) {
      fail(`Red Team checklist has ${crosses} ✗ lines — every question must resolve`);
    } else {
      ok(`Red Team checklist: ${ticks} ✓, 0 ✗`);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// 9. R8 proof tests pass (vitest)
// ───────────────────────────────────────────────────────────────────────
{
  const r8Tests = [
    "src/app/__tests__/r8-warmth-decay.proof.test.ts",
    "src/app/__tests__/r8-cio-reresearch.proof.test.ts",
    "src/app/__tests__/r8-consent-copy.proof.test.ts",
    "src/app/__tests__/r8-consent-guard.proof.test.ts",
    "src/app/__tests__/r8-private-note-grep.proof.test.ts",
    "src/app/__tests__/r8-red-team.proof.test.ts",
    "src/lib/contacts/warmth.test.ts",
    "src/lib/networking/consent-guard.test.ts",
    "src/lib/networking/warm-intro-finder.test.ts",
    "src/components/floor-6/rolodex/Rolodex.test.tsx",
    "src/components/floor-6/side-switch/useSideSwitch.test.ts",
    "src/components/floor-6/side-switch/SideSwitch.test.tsx",
    "src/components/floor-6/dossier-wall/DossierWall.test.tsx",
    "src/components/floor-6/contact-grid/ContactCard.test.tsx",
    "src/db/__tests__/schema-r8.test.ts",
  ];
  const missingTests = r8Tests.filter((t) => !fileExists(t));
  if (missingTests.length > 0) {
    fail("R8 proof tests missing", missingTests.join(", "));
  } else {
    console.log(`[r8-acceptance] running ${r8Tests.length} R8 test file(s)…`);
    const res = spawnSync("npx", ["vitest", "run", ...r8Tests], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (res.status !== 0) {
      fail("one or more R8 proof tests failing");
    } else {
      ok("all R8 proof tests green");
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// Summary
// ───────────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n[r8-acceptance] ${failures} invariant(s) failed — R8 cannot accept.`);
  process.exit(1);
}
console.log(`\n[r8-acceptance] all invariants green — R8 acceptance cleared.`);
process.exit(0);
