// src/lib/artlab/sdk/integration/agent-loop.acceptance.test.ts
//
// End-to-end acceptance gate for the ArtLab agent loop:
//
//   agent ─MCP/stdio─▶ artlab/generate
//                       │
//                       ▼  writes  inbox/sdk/generate-<runId>.json
//
//   daemon (in-process sdk-poller, real code from src/lib/artlab/daemon)
//                       │
//                       ▼  reads inbox, writes runs/<runId>/run-state.json
//                          (phase=routed), enqueues, moves inbox → .processed
//
//   test mock pipeline (substitutes the run-worker — no spawned child)
//                       │
//                       ▼  drains queue, produces a real Asset Pack manifest
//                          using a deterministic mock image provider, sets
//                          run-state phase=closed + promotedPackId
//
//   agent ─MCP/stdio─▶ artlab/generate_status → "promoted" + promotedPackId
//   agent ─MCP/stdio─▶ artlab/asset_pack_integration → snippet
//
// CRITICAL: NO `fakeDaemonPromote` shortcut. NO hand-written run-state.json
// in the inbox→queue handoff. The handoff itself is exercised by the real
// `createArtLabPoller` from `src/lib/artlab/daemon/sdk-poller.ts`.

import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createArtLabPoller } from "@/lib/artlab/daemon/sdk-poller";
import { dequeueNextRun } from "@/lib/artlab/queue/queue";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { createMockArtLabImageProvider } from "@/lib/artlab/sdk/providers/mock-provider";
import type { ArtLabRunState } from "@/lib/artlab/types";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-acc-ws-"));
  canonRoot = mkdtempSync(join(tmpdir(), "artlab-acc-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-acc-packs-"));
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  mkdirSync(join(workspaceRoot, "inbox", "sdk"), { recursive: true });
  mkdirSync(join(workspaceRoot, "runs"), { recursive: true });
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  writeFileSync(
    join(canonRoot, "characters", "sol-navarro.yaml"),
    "id: sol-navarro\ndisplayName: Sol Navarro\nsummary: receptionist on the Lobby\n",
  );
});

function inheritedEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Test-only minimal pipeline: replaces the run-worker subprocess. Drains
 * every queued run, generates bytes via the MOCK image provider, writes a
 * real ArtLab SDK Asset Pack manifest under packsRoot, and finalises the run
 * by flipping run-state to phase=closed with promotedPackId.
 *
 * This is the only thing the production daemon does that we substitute —
 * everything *before* this point (MCP write → inbox → poller → queue) is
 * real production code from `src/lib/artlab/daemon`.
 */
async function runMockPipelineUntilEmpty(input: {
  workspaceRoot: string;
  packsRoot: string;
}): Promise<string[]> {
  const provider = createMockArtLabImageProvider({ id: "mock-acceptance" });
  const promoted: string[] = [];
  for (;;) {
    const entry = dequeueNextRun(input.workspaceRoot);
    if (!entry) break;

    // Generate one mock asset image keyed by the queue entry spec so bytes
    // are deterministic per-run (matches the production provider contract).
    const description = String(entry.spec.request ?? "");
    const kind = String(entry.spec.kind ?? "character");
    const result = await provider.generate({
      prompt: description,
      aspectRatio: "1:1",
      laneIndex: 1,
      seed: 1,
    });

    const packId = `${kind}-${entry.runId.slice(0, 8)}`;
    const packDir = join(input.packsRoot, packId);
    mkdirSync(packDir, { recursive: true });
    const primaryFile = `${packId}.png`;
    writeFileSync(join(packDir, primaryFile), result.bytes);
    // The asset_pack_integration handler reads a flat manifest with
    // {packId, kind, publicPath, integration}. We emit one that yields a
    // valid sprite-animation snippet so the assertion at the end of the
    // test exercises the full code path.
    writeFileSync(
      join(packDir, "manifest.json"),
      JSON.stringify({
        packId,
        kind,
        slotId: `${kind}.acceptance`,
        promotedAt: new Date().toISOString(),
        publicPath: `/art/artlab/${packId}.png`,
        integration: { fps: 24, width: result.widthPx, height: result.heightPx, alt: packId },
        files: [{ path: primaryFile, role: "primary" }],
      }),
    );

    const runDir = join(input.workspaceRoot, "runs", entry.runId);
    const current = readRunStateSnapshot(runDir);
    if (!current) {
      throw new Error(`acceptance mock pipeline: run-state.json missing for ${entry.runId}`);
    }
    // The mock pipeline jumps straight from `routed` → `closed`; in the
    // real daemon the state machine walks through brief/concept/production.
    // The ArtLab status contract only cares about the terminal `closed`
    // + promotedPackId combination so the shortcut is faithful to the
    // observable behaviour.
    //
    // `promotedPackId` is now a first-class field on `ArtLabRunStateSchema`
    // — written by `promotion-runner.run()` in production (see Critical
    // Finding 2). The mock pipeline writes it through the same canonical
    // snapshot writer so the schema gate runs, matching what production
    // does. No more raw JSON rewrite that masked production drift.
    const closed: ArtLabRunState = {
      ...current,
      phase: "closed",
      promotedPackId: packId,
      updatedAt: new Date().toISOString(),
    };
    writeRunStateSnapshot(runDir, closed);
    promoted.push(packId);
  }
  return promoted;
}

describe("agent loop acceptance gate", () => {
  it(
    "agent ─MCP─▶ generate → real sdk-poller → mock-pipeline closes run → status=promoted → integration snippet",
    async () => {
      const repoRoot = process.cwd();
      const transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", join(repoRoot, "scripts", "foundry-mcp.ts")],
        env: {
          ...inheritedEnv(),
          ARTLAB_WORKSPACE_ROOT: workspaceRoot,
          ARTLAB_CANON_ROOT: canonRoot,
          ARTLAB_PACKS_ROOT: packsRoot,
          ARTLAB_SLOT_REGISTRY: slotRegistryPath,
        },
      });
      const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);

      try {
        // ──── Step 1: agent asks for a new Sol Navarro idle animation ────
        const gen = await client.callTool({
          name: "artlab/generate",
          arguments: {
            kind: "sprite-animation",
            description: "Sol Navarro idle breathe loop 1.2s ease-in-out",
          },
        });
        const generated = JSON.parse(
          (gen.content as Array<{ text: string }>)[0]!.text,
        ) as { runId: string; inboxPath: string; status: string };
        expect(generated.status).toBe("queued");
        expect(existsSync(generated.inboxPath)).toBe(true);

        // ──── Step 2: while only the inbox file exists, status=queued ────
        const queuedStatus = await client.callTool({
          name: "artlab/generate_status",
          arguments: { runId: generated.runId },
        });
        const queuedPayload = JSON.parse(
          (queuedStatus.content as Array<{ text: string }>)[0]!.text,
        ) as { status: string; phase: string };
        expect(queuedPayload.status).toBe("queued");
        expect(queuedPayload.phase).toBe("queued");

        // ──── Step 3: in-process REAL ArtLab SDK poller drains the inbox ────
        // No fakes, no shortcuts. This is the exact code path the daemon
        // exercises in production.
        const poller = createArtLabPoller({ workspaceRoot });
        const pollerOut = await poller.tick();
        expect(pollerOut.enqueuedRunIds).toContain(generated.runId);
        expect(pollerOut.failedFiles).toEqual([]);

        // After the poller runs, run-state.json exists at phase=routed.
        const runState = readRunStateSnapshot(join(workspaceRoot, "runs", generated.runId));
        expect(runState?.phase).toBe("routed");

        // Status should now flip to `running` because run-state.json exists
        // and is non-terminal.
        const runningStatus = await client.callTool({
          name: "artlab/generate_status",
          arguments: { runId: generated.runId },
        });
        const runningPayload = JSON.parse(
          (runningStatus.content as Array<{ text: string }>)[0]!.text,
        ) as { status: string; phase: string };
        expect(runningPayload.status).toBe("running");
        expect(runningPayload.phase).toBe("routed");

        // ──── Step 4: mock pipeline closes the run + writes Asset Pack ────
        const promotedPacks = await runMockPipelineUntilEmpty({ workspaceRoot, packsRoot });
        expect(promotedPacks).toHaveLength(1);
        const promotedPackId = promotedPacks[0]!;

        // ──── Step 5: agent polls — sees status=promoted with packId ────
        const promotedStatus = await client.callTool({
          name: "artlab/generate_status",
          arguments: { runId: generated.runId },
        });
        const promotedPayload = JSON.parse(
          (promotedStatus.content as Array<{ text: string }>)[0]!.text,
        ) as { status: string; promotedPackId: string; phase: string };
        expect(promotedPayload.status).toBe("promoted");
        expect(promotedPayload.phase).toBe("closed");
        expect(promotedPayload.promotedPackId).toBe(promotedPackId);

        // ──── Step 6: agent fetches the integration snippet ────
        const integration = await client.callTool({
          name: "artlab/asset_pack_integration",
          arguments: { packId: promotedPackId, targetFramework: "next-app-router" },
        });
        const snippet = JSON.parse(
          (integration.content as Array<{ text: string }>)[0]!.text,
        ) as { snippet: string; importStatement: string };
        expect(snippet.snippet).toContain("SpriteSheetPlayer");
        expect(snippet.snippet).toContain(promotedPackId);
      } finally {
        await client.close();
      }
    },
    60_000,
  );
});
