import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleBotCommand } from "./commands";

describe("bot command handlers", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cmd-")); });

  it("/status with no runs returns text", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "status", args: [] });
    expect(r.kind).toBe("text");
    expect(r.text).toMatch(/no .* runs/i);
  });

  it("/queue returns 'empty' when nothing queued", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "queue", args: [] });
    expect(r.text).toMatch(/empty|0 queued/i);
  });

  it("/cancel writes inbox/cancel-<runId>-*.json", async () => {
    await handleBotCommand({ workspaceRoot, commandName: "cancel", args: ["run-abc-123"] });
    expect(existsSync(join(workspaceRoot, "inbox"))).toBe(true);
    const files = readdirSync(join(workspaceRoot, "inbox"));
    expect(files.some((f) => f.startsWith("cancel-run-abc-123"))).toBe(true);
  });

  it("/health returns multi-line summary", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "health", args: [] });
    expect(r.text.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("unknown command returns help text", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "dance", args: [] });
    expect(r.text).toMatch(/unknown|known commands/i);
  });
});
