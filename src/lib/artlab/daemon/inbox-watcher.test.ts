// src/lib/artlab/daemon/inbox-watcher.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, existsSync } from "node:fs";
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

  it("quarantines a malformed intent into .bad/ instead of deleting it (no data loss)", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    // "produce-bad" sorts before "produce-good", so the malformed file is
    // processed first — it must not take the valid one down with it.
    writeFileSync(join(inboxDir, "produce-bad.json"), "{ not valid json");
    writeFileSync(join(inboxDir, "produce-good.json"), JSON.stringify({ request: "ok" }));

    const result = await drainInbox({ workspaceRoot, subdir: "cli", prefix: "produce-" });

    // The valid intent is still drained.
    expect(result.intents.map((i) => i.body.request)).toEqual(["ok"]);
    // Neither produce-*.json remains in the scan path (good drained, bad moved).
    expect(readdirSync(inboxDir).filter((f) => f.endsWith(".json"))).toEqual([]);
    // The malformed payload is preserved under .bad/ for inspection, not lost.
    const badDir = join(inboxDir, ".bad");
    expect(existsSync(badDir)).toBe(true);
    const quarantined = readdirSync(badDir);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]).toContain("produce-bad.json");
  });
});
