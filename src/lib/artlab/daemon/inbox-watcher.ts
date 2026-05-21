// src/lib/artlab/daemon/inbox-watcher.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
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
    try {
      const body = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      intents.push({ filename: file, body });
    } catch { /* skip malformed */ }
    unlinkSync(path);
  }
  return { intents };
}
