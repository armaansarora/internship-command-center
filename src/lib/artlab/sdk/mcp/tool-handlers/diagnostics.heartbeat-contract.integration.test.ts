// src/lib/artlab/sdk/mcp/tool-handlers/diagnostics.heartbeat-contract.integration.test.ts
//
// Integration regression — heartbeat field-name contract.
//
// In production the ArtLab daemon (src/lib/artlab/daemon/entry.ts) writes
// `{ at: <ISO timestamp> }` into `daemon-heartbeat.json` on every tick.
// The ArtLab MCP diagnostics handler previously read the field as
// `writtenAt`. Because the two were misaligned, `new Date(undefined)`
// returned NaN and `daemonUp` evaluated to `false` for every fresh heartbeat
// — the operator-facing health probe lied about a running daemon.
//
// This test boots the daemon (one tick) so the real production writer emits
// the heartbeat, then invokes the diagnostics handler against the same
// workspace and asserts `daemonUp === true`. It guards against any future
// drift between the writer and reader contract.
import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDaemonContext, runDaemonOnce } from "@/lib/artlab/daemon/entry";
import { handleArtLabDiagnostics } from "./diagnostics";

describe("diagnostics ↔ daemon heartbeat contract", () => {
  it("daemonUp=true when the production daemon wrote a fresh heartbeat", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-diag-heartbeat-"));
    const ctx = createDaemonContext({
      workspaceRoot,
      telegramPoller: { tick: vi.fn().mockResolvedValue(undefined) },
      queueProcessor: { tick: vi.fn().mockResolvedValue(undefined) },
    });
    await runDaemonOnce(ctx);

    const path = join(workspaceRoot, "daemon-heartbeat.json");
    expect(existsSync(path)).toBe(true);
    // Sanity: the writer emits the canonical field name.
    const written = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    expect(typeof written.at).toBe("string");

    const result = await handleArtLabDiagnostics(
      {},
      { workspaceRoot, providerProbes: {} },
    );
    expect(result.daemonUp).toBe(true);
  });

  it("daemonUp=false when the heartbeat file is missing", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-diag-heartbeat-missing-"));
    const result = await handleArtLabDiagnostics(
      {},
      { workspaceRoot, providerProbes: {} },
    );
    expect(result.daemonUp).toBe(false);
  });
});
