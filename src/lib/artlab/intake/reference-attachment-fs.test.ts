import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveReferenceAttachment } from "./reference-attachment-fs";

describe("reference attachment fs", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-attach-")); });

  it("writes a downloaded photo into inbox/attachments/<runId>/<fileId>.png", async () => {
    const downloader = {
      downloadFile: vi.fn().mockResolvedValue({ contentType: "image/png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }),
    };
    const path = await saveReferenceAttachment({ workspaceRoot, runId: "run-1", fileId: "fABC", downloader });
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBe(4);
    expect(path).toMatch(/inbox\/attachments\/run-1\/fABC\.png$/);
  });

  it("uses .jpg extension when contentType is image/jpeg", async () => {
    const downloader = {
      downloadFile: vi.fn().mockResolvedValue({ contentType: "image/jpeg", bytes: Buffer.from([0xff, 0xd8]) }),
    };
    const path = await saveReferenceAttachment({ workspaceRoot, runId: "run-1", fileId: "fJPG", downloader });
    expect(path.endsWith(".jpg")).toBe(true);
  });
});
