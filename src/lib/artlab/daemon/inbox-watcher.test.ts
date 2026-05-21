// src/lib/artlab/daemon/inbox-watcher.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drainInbox } from "./inbox-watcher";

describe("inbox watcher (drain)", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-iw-")); });

  it("returns intent files matching the prefix and removes them", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "produce-1.json"), JSON.stringify({ request: "make Sol" }));
    writeFileSync(join(inboxDir, "produce-2.json"), JSON.stringify({ request: "make Rafe" }));
    writeFileSync(join(inboxDir, "other.txt"), "skip me");
    const result = await drainInbox({ workspaceRoot, subdir: "cli", prefix: "produce-" });
    expect(result.intents.map((i) => i.body.request)).toEqual(["make Sol", "make Rafe"]);
    const remaining = readdirSync(inboxDir);
    expect(remaining).toEqual(["other.txt"]);
  });
});
