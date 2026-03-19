#!/usr/bin/env npx tsx
/**
 * check-vercel.ts — Writes Vercel deploy status to .vercel-status.json
 *
 * This script is called by agents (not humans) to inject Vercel deploy
 * status into the bootstrap output. The bootstrap generator reads
 * .vercel-status.json if present.
 *
 * Usage by agents:
 *   1. Query Vercel API via connector for latest deployment
 *   2. Write result to .vercel-status.json:
 *      { "state": "READY", "commit": "89ef7fc", "url": "...", "age": "2h ago" }
 *   3. Run npm run bootstrap — status appears in output
 *
 * Manual usage:
 *   npx tsx scripts/check-vercel.ts --state READY --commit 89ef7fc --url "https://..."
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, ".vercel-status.json");

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

const state = getFlag("state") ?? "UNKNOWN";
const commit = getFlag("commit") ?? "unknown";
const url = getFlag("url") ?? "";
const message = getFlag("message") ?? "";

const status = {
  state,
  commit,
  url,
  message,
  checkedAt: new Date().toISOString(),
};

writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
console.log(`✓ .vercel-status.json written: ${state} (commit ${commit})`);
