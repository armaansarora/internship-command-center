#!/usr/bin/env tsx
/**
 * R6 Acceptance Check.
 *
 * Enforces the partner-binding constraint: 9/10 tasks ≠ acceptance.met.
 * Must be run by `tower verify` before flipping R6's ledger.
 * Exits 0 iff:
 *   - All 5 Intent-level tasks (R6.3, R6.4, R6.5, R6.6, R6.8) are marked
 *     complete in the R6 ledger.
 *   - R6 proof suite passes (5 invariants green).
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const LEDGER_PATH = resolve(process.cwd(), ".ledger/R6-the-briefing-room-floor-3.yml");
const PROOF_PATH = "src/app/__tests__/r6-briefing-room.proof.test.ts";
const INTENT_TASKS = ["R6.3", "R6.4", "R6.5", "R6.6", "R6.8"];

function fail(reason: string, detail?: string): never {
  console.error(`[r6-acceptance] ✗ ${reason}`);
  if (detail) console.error(detail);
  console.error("[r6-acceptance] acceptance NOT met — do not flip acceptance.met");
  process.exit(1);
}

if (!existsSync(LEDGER_PATH)) {
  fail(`ledger missing at ${LEDGER_PATH}`);
}
const ledger = readFileSync(LEDGER_PATH, "utf8");

for (const id of INTENT_TASKS) {
  const escaped = id.replace(".", "\\.");
  const re = new RegExp(`^\\s{2}${escaped}:[\\s\\S]*?status:\\s*complete`, "m");
  if (!re.test(ledger)) {
    fail(`Intent-level task ${id} is not complete — Intent-level tasks cannot be deferred`);
  }
}
console.log("[r6-acceptance] ✓ all 5 Intent-level tasks complete");

const proof = spawnSync("npx", ["vitest", "run", PROOF_PATH], {
  encoding: "utf8",
  stdio: "pipe",
});
if (proof.status !== 0) {
  fail("R6 proof suite failed", proof.stdout + "\n" + proof.stderr);
}
console.log("[r6-acceptance] ✓ R6 proof suite green");
console.log("[r6-acceptance] ✓ acceptance met — ready to flip acceptance.met");
