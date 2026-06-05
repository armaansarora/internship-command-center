// src/lib/artlab/daemon/inbox-watcher.ts
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

export interface DrainInboxInput {
  workspaceRoot: string;
  subdir: string;
  prefix: string;
}

export interface InboxIntent {
  filename: string;
  body: Record<string, unknown>;
}

export interface DrainInboxResult { intents: InboxIntent[]; }

export async function drainInbox(input: DrainInboxInput): Promise<DrainInboxResult> {
  const dir = join(input.workspaceRoot, "inbox", input.subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return { intents: [] };
  }
  const files = readdirSync(dir).filter((f) => f.startsWith(input.prefix) && f.endsWith(".json")).sort();
  const intents: InboxIntent[] = [];
  for (const file of files) {
    const path = join(dir, file);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch {
      // Malformed or partially-written intent (e.g. caught mid-write).
      // Quarantine rather than delete so the payload can be inspected — a
      // dropped request used to vanish with no trace.
      quarantineBadIntent(dir, file, path);
      continue;
    }
    intents.push({ filename: file, body });
    unlinkSync(path);
  }
  return { intents };
}

/**
 * Move a malformed intent file into `<inbox>/<subdir>/.bad/` so it stops being
 * rescanned but is preserved for debugging. The `.bad` directory is not a
 * `.json` file, so the prefix/extension filter in drainInbox never picks it up.
 * If even the move fails (rare — same filesystem), the file is left in place;
 * a retry next tick is preferable to silent data loss.
 */
function quarantineBadIntent(dir: string, file: string, path: string): void {
  try {
    const badDir = join(dir, ".bad");
    mkdirSync(badDir, { recursive: true });
    renameSync(path, join(badDir, `${Date.now()}-${file}`));
  } catch {
    /* leave the file in place rather than lose it */
  }
}
