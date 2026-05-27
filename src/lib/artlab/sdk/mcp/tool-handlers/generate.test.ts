import { describe, expect, it, beforeEach } from "vitest";
import {
  mkdtempSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabGenerate } from "./generate";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-generate-"));
});

describe("handleArtLabGenerate", () => {
  it("writes a queue entry and returns a UUID v4 runId in queued status", async () => {
    const result = await handleArtLabGenerate(
      { kind: "floor", description: "A new war room background at dusk", priority: "normal" },
      { workspaceRoot },
    );
    expect(result.status).toBe("queued");
    expect(result.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.queuedAt).toBeTruthy();
    expect(result.inboxPath).toBeTruthy();
    expect(existsSync(result.inboxPath!)).toBe(true);
  });

  it("the queued JSON payload contains the parsed input + a kind field", async () => {
    const result = await handleArtLabGenerate(
      {
        kind: "icon",
        description: "Tower elevator floor indicator chevron",
        priority: "high",
        requesterAgent: "claude-code/agent-x",
      },
      { workspaceRoot },
    );
    const payload = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as {
      kind: string;
      description: string;
      priority: string;
      requesterAgent: string;
      runId: string;
    };
    expect(payload.kind).toBe("icon");
    expect(payload.description).toMatch(/elevator floor indicator chevron/);
    expect(payload.requesterAgent).toBe("claude-code/agent-x");
    expect(payload.runId).toBe(result.runId);
  });

  it("inbox path uses the runId in the filename for traceability", async () => {
    const result = await handleArtLabGenerate(
      { kind: "ui-texture", description: "Soft brass gradient for primary buttons" },
      { workspaceRoot },
    );
    const inboxDir = join(workspaceRoot, "inbox", "sdk");
    const files = readdirSync(inboxDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain(result.runId);
  });

  it("rejects descriptions shorter than 8 chars", async () => {
    await expect(
      handleArtLabGenerate({ kind: "icon", description: "hi" }, { workspaceRoot }),
    ).rejects.toThrow();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Brain-enrichment race regression — see Critical Finding 1.
  //
  // The previous design rewrote the MAIN inbox file post-enrichment using
  // temp+rename without `wx`. If the daemon poller archived the file into
  // `.processed/` between the initial write and the post-enrichment rewrite,
  // the rename RECREATED `generate-<runId>.json` in the live inbox — the
  // next poll tick re-seeded a duplicate run and re-enqueued (the queue's
  // `wx` guard then surfaced as a daemon-errors EEXIST).
  //
  // Resolution (option c): write the brain hint to a SIDECAR file
  // `generate-<runId>.brain-hint.json`. The main inbox file is written once
  // up-front and never touched again. Even if the sidecar lands after the
  // poller archives the inbox file, it cannot resurrect the trigger file —
  // the orphan sidecar is filtered out by the poller's filename predicate.
  // ─────────────────────────────────────────────────────────────────────────
  describe("brain enrichment sidecar (race-safe)", () => {
    function inboxFilesFor(runId: string): string[] {
      const dir = join(workspaceRoot, "inbox", "sdk");
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((f) => f.includes(runId));
    }

    it("never rewrites the main inbox file — brain hint lands on a sidecar", async () => {
      let resolveEnrich!: (v: Record<string, unknown>) => void;
      const enrichPromise = new Promise<Record<string, unknown>>((res) => {
        resolveEnrich = res;
      });
      const result = await handleArtLabGenerate(
        { kind: "character", description: "Rafe needs a charcoal wool jacket pass" },
        {
          workspaceRoot,
          brainEnrich: () => enrichPromise,
        },
      );
      // Main inbox file written with brainHintStatus=pending.
      const main = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as Record<string, unknown>;
      expect(main.brainHintStatus).toBe("pending");
      // Sidecar does not yet exist (enrichment not resolved).
      const sidecar = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
      expect(existsSync(sidecar)).toBe(false);
      // Resolve enrichment and wait for the sidecar to land.
      resolveEnrich({ targetStyle: "wool-luxe" });
      for (let i = 0; i < 50; i += 1) {
        if (existsSync(sidecar)) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(existsSync(sidecar)).toBe(true);
      const hint = JSON.parse(readFileSync(sidecar, "utf8")) as Record<string, unknown>;
      expect(hint.brainHintStatus).toBe("ready");
      expect(hint.brainHint).toEqual({ targetStyle: "wool-luxe" });
      // CRITICAL: main inbox file content was NEVER mutated post-write.
      const mainAfter = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as Record<string, unknown>;
      expect(mainAfter.brainHintStatus).toBe("pending");
      expect(mainAfter.brainHint).toBeUndefined();
    });

    it("routes the sidecar to .processed/ when enrichment completes after poller archives the trigger", async () => {
      // Race simulation: poller archives the inbox file BEFORE enrichment
      // resolves. The post-enrichment write must NOT recreate the trigger
      // in the live inbox; instead, the sidecar lands in `.processed/` so
      // operators can still audit the enrichment outcome and the poller's
      // trigger-file glob never picks it up.
      let resolveEnrich!: (v: Record<string, unknown>) => void;
      const enrichPromise = new Promise<Record<string, unknown>>((res) => {
        resolveEnrich = res;
      });
      const result = await handleArtLabGenerate(
        { kind: "character", description: "Mara silk lapel update" },
        {
          workspaceRoot,
          brainEnrich: () => enrichPromise,
        },
      );
      // Simulate the poller archiving the inbox file mid-enrichment.
      const inboxDir = join(workspaceRoot, "inbox", "sdk");
      const processed = join(inboxDir, ".processed");
      mkdirSync(processed, { recursive: true });
      renameSync(result.inboxPath!, join(processed, `${result.runId}.json`));
      expect(existsSync(result.inboxPath!)).toBe(false);
      // Now finish enrichment and wait for the archived sidecar to land.
      resolveEnrich({ targetStyle: "silk" });
      const archivedSidecar = join(processed, `${result.runId}.brain-hint.json`);
      for (let i = 0; i < 50; i += 1) {
        if (existsSync(archivedSidecar)) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      // CRITICAL: the main inbox trigger file must NOT have been recreated.
      expect(existsSync(result.inboxPath!)).toBe(false);
      // The trigger-file glob the poller uses must find no live files.
      const triggerFiles = inboxFilesFor(result.runId).filter(
        (f) => f.startsWith("generate-") && f.endsWith(".json") && !f.includes(".brain-hint"),
      );
      expect(triggerFiles).toEqual([]);
      // The sidecar lands in `.processed/` so the brain hint isn't lost on
      // the floor — see the sdk-poller race regression for the
      // run-state merge path that completes the picture.
      expect(existsSync(archivedSidecar)).toBe(true);
      const hint = JSON.parse(readFileSync(archivedSidecar, "utf8")) as Record<string, unknown>;
      expect(hint.brainHintStatus).toBe("ready");
      expect(hint.brainHint).toEqual({ targetStyle: "silk" });
      // The orphan-sidecar-in-inbox path is retired — the live inbox must
      // NOT contain a sidecar for this runId.
      const liveSidecar = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
      expect(existsSync(liveSidecar)).toBe(false);
    });

    it("records enrichment failure on the sidecar without touching the main file", async () => {
      const result = await handleArtLabGenerate(
        { kind: "ui-texture", description: "Failing brain enrichment regression" },
        {
          workspaceRoot,
          brainEnrich: async () => {
            throw new Error("provider down");
          },
        },
      );
      const sidecar = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
      for (let i = 0; i < 50; i += 1) {
        if (existsSync(sidecar)) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(existsSync(sidecar)).toBe(true);
      const hint = JSON.parse(readFileSync(sidecar, "utf8")) as Record<string, unknown>;
      expect(hint.brainHintStatus).toBe("failed");
      expect(String(hint.brainHintError)).toMatch(/provider down/);
      // Main file unchanged.
      const main = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as Record<string, unknown>;
      expect(main.brainHintStatus).toBe("pending");
    });
  });
});
