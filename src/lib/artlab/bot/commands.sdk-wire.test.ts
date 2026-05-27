import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleBotCommand } from "./commands";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "bot-artlab-wire-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  writeFileSync(join(workspaceRoot, "slots", "registry.json"), JSON.stringify({ slots: [] }));
});

describe("bot /sdk routing", () => {
  it("/sdk without args returns help text", async () => {
    const result = await handleBotCommand({
      workspaceRoot,
      commandName: "sdk",
      args: [],
    });
    expect(result.message.text).toMatch(/sdk status/i);
  });

  it("/sdk status returns the daemon snapshot", async () => {
    const result = await handleBotCommand({
      workspaceRoot,
      commandName: "sdk",
      args: ["status"],
    });
    expect(result.message.text).toMatch(/daemon/i);
  });
});
