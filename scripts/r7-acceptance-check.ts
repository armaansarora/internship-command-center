#!/usr/bin/env tsx
/**
 * R7 Acceptance Check.
 *
 * Enforces the partner-binding constraints for Floor 4 (The Situation Room):
 *   1. Every Intent-level task ships (R7.2, R7.3, R7.4, R7.5, R7.7, R7.8, R7.9).
 *      These are NOT polish. Acceptance is blocked until all are complete.
 *   2. Zero `alert()` / `toast(` / `sonner` / `react-hot-toast` anywhere in
 *      R7 surfaces: src/app/api/outreach, src/app/api/notifications,
 *      src/components/floor-4, src/hooks/useTubeDeliveries*.
 *   3. Load-bearing architectural hooks are wired:
 *      - Approve route stamps `send_after` (real undo window).
 *      - Cron outreach-sender filters by `send_after <= now`.
 *      - Undo route filters by `send_after > now` (DB-level mutual exclusion).
 *      - `computeDeliverAfter` helper exported (quiet-hours queueing).
 *      - `synthThunk` helper exported (tube arrival sound).
 *      - `RingPulseController` exists (rings-on-click).
 *      - `SituationMapList` exists (honest fallback).
 *   4. Migration 0017 file exists.
 *   5. Vercel cron registered for /api/cron/draft-follow-ups.
 *   6. R7 proof suite passes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";

const LEDGER_PATH = resolve(process.cwd(), ".ledger/R7-the-situation-room-floor-4.yml");
const PROOF_PATH = "src/app/__tests__/r7-situation-room.proof.test.ts";
const INTENT_TASKS = ["R7.2", "R7.3", "R7.4", "R7.5", "R7.7", "R7.8", "R7.9"];

let failures = 0;

function ok(msg: string): void {
  console.log(`[r7-acceptance] ✓ ${msg}`);
}
function fail(reason: string, detail?: string): void {
  failures += 1;
  console.error(`[r7-acceptance] ✗ ${reason}`);
  if (detail) console.error(`  ${detail}`);
}
function fileContains(path: string, needle: string | RegExp): boolean {
  if (!existsSync(path)) return false;
  const body = readFileSync(path, "utf8");
  return typeof needle === "string" ? body.includes(needle) : needle.test(body);
}
function fileExists(path: string): boolean {
  return existsSync(resolve(process.cwd(), path));
}

// --------------------------------------------------------------------
// 1. Ledger — all Intent-level tasks complete
// --------------------------------------------------------------------
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
  if (failures === 0) ok("all 7 Intent-level tasks complete");
}

// --------------------------------------------------------------------
// 2. No alert()/toast()/sonner/react-hot-toast in R7 surfaces
// --------------------------------------------------------------------
const FORBIDDEN_PATTERNS: Array<RegExp> = [
  /\balert\(/,
  /\btoast\(/,
  /["']sonner["']/,
  /["']react-hot-toast["']/,
];

function walkDir(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkDir(p));
    } else if (/\.(t|j)sx?$/.test(ent.name) && !ent.name.endsWith(".test.ts") && !ent.name.endsWith(".test.tsx")) {
      out.push(p);
    }
  }
  return out;
}

const R7_SURFACES = [
  resolve(process.cwd(), "src/app/api/outreach"),
  resolve(process.cwd(), "src/app/api/notifications"),
  resolve(process.cwd(), "src/components/floor-4"),
  resolve(process.cwd(), "src/components/world/PneumaticTubeArrivalOverlay.tsx"),
  resolve(process.cwd(), "src/hooks/useTubeDeliveries.ts"),
];
for (const surface of R7_SURFACES) {
  const files = existsSync(surface)
    ? (statSync(surface).isDirectory() ? walkDir(surface) : [surface])
    : [];
  for (const f of files) {
    const body = readFileSync(f, "utf8");
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(body)) {
        fail(`R7 surface ${f} matches forbidden pattern ${pat}`);
      }
    }
  }
}
ok("no alert/toast/sonner/react-hot-toast in R7 surfaces");

// --------------------------------------------------------------------
// 3. Architectural hooks wired
// --------------------------------------------------------------------
const APPROVE_ROUTE = "src/app/api/outreach/approve/route.ts";
if (!fileContains(APPROVE_ROUTE, "send_after")) {
  fail(`${APPROVE_ROUTE} must stamp send_after`);
} else ok("approve route stamps send_after");

const UNDO_ROUTE = "src/app/api/outreach/undo/route.ts";
if (!fileContains(UNDO_ROUTE, ".gt(\"send_after\"")) {
  fail(`${UNDO_ROUTE} must filter .gt("send_after", ...) — DB-level mutual exclusion`);
} else ok("undo route filters .gt(\"send_after\", ...)");

const CRON_SENDER = "src/app/api/cron/outreach-sender/route.ts";
if (!fileContains(CRON_SENDER, ".lte(\"send_after\"")) {
  fail(`${CRON_SENDER} must filter .lte("send_after", ...)`);
} else ok("cron outreach-sender filters .lte(\"send_after\", ...)");

const QUIET_HOURS = "src/lib/notifications/quiet-hours.ts";
if (!fileContains(QUIET_HOURS, "computeDeliverAfter")) {
  fail(`${QUIET_HOURS} must export computeDeliverAfter`);
} else ok("computeDeliverAfter exported");

const THUNK = "src/lib/audio/synth-thunk.ts";
if (!fileContains(THUNK, "synthThunk")) {
  fail(`${THUNK} must export synthThunk`);
} else ok("synthThunk exported");

const RING_CTRL = "src/components/floor-4/rings/RingPulseController.tsx";
if (!fileContains(RING_CTRL, "RingPulseController")) {
  fail(`${RING_CTRL} must export RingPulseController`);
} else ok("RingPulseController present (rings-on-click)");

const MAP_LIST = "src/components/floor-4/situation-map/SituationMapList.tsx";
if (!fileContains(MAP_LIST, "SituationMapList")) {
  fail(`${MAP_LIST} must export SituationMapList — honest fallback is non-negotiable`);
} else ok("SituationMapList present (list fallback wired)");

// --------------------------------------------------------------------
// 4. Migration 0017
// --------------------------------------------------------------------
const MIGRATION = "src/db/migrations/0017_r7_situation_room.sql";
if (!fileExists(MIGRATION)) {
  fail(`${MIGRATION} missing`);
} else ok("migration 0017 present");

// --------------------------------------------------------------------
// 5. Vercel cron registered
// --------------------------------------------------------------------
const VERCEL = "vercel.json";
if (!fileContains(VERCEL, "/api/cron/draft-follow-ups")) {
  fail(`${VERCEL} missing /api/cron/draft-follow-ups entry`);
} else ok("draft-follow-ups cron registered");

// --------------------------------------------------------------------
// 6. R7 proof suite
// --------------------------------------------------------------------
const proof = spawnSync("npx", ["vitest", "run", PROOF_PATH], {
  encoding: "utf8",
  stdio: "pipe",
});
if (proof.status !== 0) {
  fail("R7 proof suite failed", proof.stdout + "\n" + proof.stderr);
} else {
  ok("R7 proof suite green");
}

// --------------------------------------------------------------------
// Final verdict
// --------------------------------------------------------------------
if (failures > 0) {
  console.error(`\n[r7-acceptance] FAILED — ${failures} issue(s). acceptance NOT met.`);
  process.exit(1);
}
console.log("\n[r7-acceptance] ✓ acceptance met — ready to flip acceptance.met");
