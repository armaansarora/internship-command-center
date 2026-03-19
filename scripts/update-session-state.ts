#!/usr/bin/env npx tsx
/**
 * update-session-state.ts — Update SESSION-STATE.json from CLI.
 *
 * Usage:
 *   npx tsx scripts/update-session-state.ts --task "Building CRO agent" --deliverable "1.4" --status "in_progress"
 *   npx tsx scripts/update-session-state.ts --task "Pipeline viz" --blocker "Need @dnd-kit installed" --last "src/components/Pipeline.tsx"
 *   npx tsx scripts/update-session-state.ts --clear   # Reset session state
 *
 * Flags:
 *   --task <string>       Current task description
 *   --deliverable <string> MASTER-PLAN deliverable number (e.g., "1.2")
 *   --status <string>     Status: in_progress | blocked | review | complete
 *   --blocker <string>    Add a blocker (can be repeated)
 *   --last <string>       Last file touched
 *   --notes <string>      Free-form notes
 *   --clear               Reset to empty state
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const STATE_PATH = join(ROOT, "SESSION-STATE.json");

interface SessionState {
  currentTask?: string;
  deliverable?: string;
  status?: string;
  blockers?: string[];
  lastFileTouched?: string;
  notes?: string;
  updatedAt?: string;
}

// Parse args
const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function getAllFlags(name: string): string[] {
  const results: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && i + 1 < args.length) {
      results.push(args[i + 1]);
    }
  }
  return results;
}

const isClear = args.includes("--clear");

if (isClear) {
  if (existsSync(STATE_PATH)) {
    writeFileSync(STATE_PATH, "{}");
    console.log("✓ SESSION-STATE.json cleared");
  } else {
    console.log("No SESSION-STATE.json to clear");
  }
  process.exit(0);
}

// Load existing state
let state: SessionState = {};
if (existsSync(STATE_PATH)) {
  try {
    state = JSON.parse(readFileSync(STATE_PATH, "utf-8")) as SessionState;
  } catch { /* start fresh */ }
}

// Update fields
const task = getFlag("task");
const deliverable = getFlag("deliverable");
const status = getFlag("status");
const blockers = getAllFlags("blocker");
const last = getFlag("last");
const notes = getFlag("notes");

if (task) state.currentTask = task;
if (deliverable) state.deliverable = deliverable;
if (status) state.status = status;
if (blockers.length > 0) state.blockers = [...(state.blockers ?? []), ...blockers];
if (last) state.lastFileTouched = last;
if (notes) state.notes = notes;

state.updatedAt = new Date().toISOString();

writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
console.log("✓ SESSION-STATE.json updated:");
console.log(JSON.stringify(state, null, 2));
