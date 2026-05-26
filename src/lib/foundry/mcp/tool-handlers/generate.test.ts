import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryGenerate } from "./generate";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-generate-"));
});

describe("handleFoundryGenerate", () => {
  it("writes a queue entry and returns a UUID v4 runId in queued status", async () => {
    const result = await handleFoundryGenerate(
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
    const result = await handleFoundryGenerate(
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
    const result = await handleFoundryGenerate(
      { kind: "ui-texture", description: "Soft brass gradient for primary buttons" },
      { workspaceRoot },
    );
    const inboxDir = join(workspaceRoot, "inbox", "foundry");
    const files = readdirSync(inboxDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain(result.runId);
  });

  it("rejects descriptions shorter than 8 chars", async () => {
    await expect(
      handleFoundryGenerate({ kind: "icon", description: "hi" }, { workspaceRoot }),
    ).rejects.toThrow();
  });
});
