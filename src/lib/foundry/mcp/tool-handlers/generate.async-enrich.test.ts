import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryGenerate } from "./generate";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-async-enrich-"));
});

describe("generate handler — async brain enrichment (performance contract)", () => {
  it("returns in <500ms even when brainEnrich takes 5 seconds (does not block)", async () => {
    let enrichResolve!: (value: Record<string, unknown>) => void;
    const enrichPromise = new Promise<Record<string, unknown>>((resolve) => {
      enrichResolve = resolve;
    });

    const slowEnrich = async (): Promise<Record<string, unknown>> => {
      // Caller intentionally hangs for 5+ seconds. The MCP response must
      // NOT wait for this; it should return the runId immediately.
      return enrichPromise;
    };

    const start = Date.now();
    const result = await handleFoundryGenerate(
      { kind: "character", description: "Rafe with a charcoal jacket update" },
      { workspaceRoot, brainEnrich: slowEnrich },
    );
    const elapsedMs = Date.now() - start;

    // Performance gate: the response must come back in well under the
    // 5-second enrich latency. 500ms covers cold-start jitter on CI.
    expect(elapsedMs).toBeLessThan(500);
    expect(result.status).toBe("queued");
    expect(result.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.inboxPath).toBeTruthy();
    expect(existsSync(result.inboxPath!)).toBe(true);

    // Inbox file must exist immediately with status=queued and no brainHint yet.
    const initial = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as Record<
      string,
      unknown
    >;
    expect(initial.runId).toBe(result.runId);
    expect(initial.brainHintStatus).toBe("pending");
    expect(initial.brainHint).toBeUndefined();

    // Now let the brain "respond" and verify the SIDECAR is written.
    // The main inbox file is write-once — enrichment lands on a sidecar
    // (see brain-enrich-race comment in generate.ts).
    enrichResolve({ agent: "character-master", plan: "after-the-fact" });
    const sidecarPath = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
    for (let i = 0; i < 50; i += 1) {
      if (existsSync(sidecarPath)) {
        const payload = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<
          string,
          unknown
        >;
        if (payload.brainHintStatus === "ready") {
          expect((payload.brainHint as Record<string, unknown>).agent).toBe(
            "character-master",
          );
          // Main inbox file unchanged.
          const mainAfter = JSON.parse(
            readFileSync(result.inboxPath!, "utf8"),
          ) as Record<string, unknown>;
          expect(mainAfter.brainHintStatus).toBe("pending");
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error("brainHint sidecar never landed");
  });

  it("when brainEnrich rejects, the sidecar file records the failure but the run still queues", async () => {
    const failingEnrich = async (): Promise<Record<string, unknown>> => {
      throw new Error("anthropic 429 backoff exhausted");
    };

    const result = await handleFoundryGenerate(
      { kind: "character", description: "Rafe needs a haircut update" },
      { workspaceRoot, brainEnrich: failingEnrich },
    );
    expect(result.status).toBe("queued");
    // Wait for the async error path to write the sidecar.
    const sidecarPath = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
    for (let i = 0; i < 50; i += 1) {
      if (existsSync(sidecarPath)) {
        const payload = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<
          string,
          unknown
        >;
        if (payload.brainHintStatus === "failed") {
          expect(payload.brainHintError).toMatch(/anthropic 429/);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error("failed brainHint sidecar never recorded");
  });

  it("when no brainEnrich is supplied, no brainHintStatus appears (back-compat)", async () => {
    const result = await handleFoundryGenerate(
      { kind: "icon", description: "elevator chevron indicator update" },
      { workspaceRoot },
    );
    const payload = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as Record<
      string,
      unknown
    >;
    expect(payload.brainHintStatus).toBeUndefined();
    expect(payload.brainHint).toBeUndefined();
  });
});
