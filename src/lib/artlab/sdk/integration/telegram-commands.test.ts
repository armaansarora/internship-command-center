import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabTelegramCommand } from "./telegram-commands";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-tg-"));
  canonRoot = mkdtempSync(join(tmpdir(), "artlab-tg-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-tg-packs-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
});

describe("handleArtLabTelegramCommand", () => {
  it("/sdk without a subcommand prints help", async () => {
    const result = await handleArtLabTelegramCommand({
      args: [],
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
    });
    expect(result.text).toMatch(/sdk status/i);
    expect(result.text).toMatch(/sdk list/i);
    expect(result.text).toMatch(/sdk generate/i);
    expect(result.text).toMatch(/sdk preview/i);
  });

  it("/sdk status returns a diagnostics-formatted text", async () => {
    const result = await handleArtLabTelegramCommand({
      args: ["status"],
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
    });
    expect(result.text).toMatch(/daemon/i);
    expect(result.text).toMatch(/backlog/i);
  });

  it("/sdk list character returns a list of canon characters", async () => {
    mkdirSync(join(canonRoot, "characters"), { recursive: true });
    writeFileSync(join(canonRoot, "characters", "rafe.yaml"), "id: rafe-calder\ndisplayName: Rafe Calder\nsummary: CRO\n");
    const result = await handleArtLabTelegramCommand({
      args: ["list", "character"],
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
    });
    expect(result.text).toMatch(/Rafe Calder/);
  });

  it("/sdk generate queues a run and reports the runId", async () => {
    const result = await handleArtLabTelegramCommand({
      args: ["generate", "character", "Rafe", "in", "a", "new", "jacket"],
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
    });
    expect(result.text).toMatch(/queued/i);
    expect(result.text).toMatch(/[0-9a-f-]{36}/i);
  });

  it("/sdk preview <packId> returns a photo payload when the pack exists", async () => {
    mkdirSync(join(packsRoot, "rafe-v1"), { recursive: true });
    writeFileSync(
      join(packsRoot, "rafe-v1", "manifest.json"),
      JSON.stringify({
        packId: "rafe-v1", kind: "character", slotId: "rafe.idle",
        promotedAt: "2026-05-25T12:00:00.000Z",
        files: [{ path: "rafe.png", role: "primary" }],
      }),
    );
    writeFileSync(join(packsRoot, "rafe-v1", "rafe.png"), Buffer.from("PNGDATA"));
    const result = await handleArtLabTelegramCommand({
      args: ["preview", "rafe-v1"],
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
    });
    expect(result.photo).toBeDefined();
    expect(result.photo?.path).toMatch(/rafe\.png$/);
  });
});
