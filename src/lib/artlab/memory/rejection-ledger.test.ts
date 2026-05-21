import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRejection, readRejections } from "./rejection-ledger";

describe("rejection ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-rej-")); });

  it("appends and reads rejections", () => {
    appendRejection(dir, {
      characterId: "otis",
      runId: "rOtisV3",
      lane: 5,
      rejectedAt: new Date().toISOString(),
      reason: "jawline too perfect",
      qaFailureCodes: ["style-coherence-failed"],
      promptHashRejected: "sha256:zzz",
    });
    const list = readRejections(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.reason).toContain("jawline");
  });
});
