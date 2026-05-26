import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryAssetPackGet } from "./asset-pack-get";

let packsRoot: string;

beforeEach(() => {
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-pack-get-"));
  mkdirSync(join(packsRoot, "rafe-v3", "frames"), { recursive: true });
  writeFileSync(
    join(packsRoot, "rafe-v3", "manifest.json"),
    JSON.stringify({
      packId: "rafe-v3",
      kind: "character",
      slotId: "rafe.idle",
      promotedAt: "2026-05-25T12:00:00.000Z",
      files: [
        { path: "rafe.png", role: "primary" },
        { path: "frames/rafe-0.png", role: "frame" },
      ],
    }),
  );
  writeFileSync(join(packsRoot, "rafe-v3", "rafe.png"), Buffer.from("PNGDATA"));
  writeFileSync(join(packsRoot, "rafe-v3", "frames", "rafe-0.png"), Buffer.from("PNGDATA-FRAME"));
});

describe("handleFoundryAssetPackGet", () => {
  it("returns manifest + every file listed with byte size", async () => {
    const result = await handleFoundryAssetPackGet({ packId: "rafe-v3" }, { packsRoot });
    expect(result.packId).toBe("rafe-v3");
    expect(result.files).toHaveLength(2);
    expect(result.files.find((f) => f.role === "primary")?.bytes).toBeGreaterThan(0);
  });

  it("throws when packId is unknown", async () => {
    await expect(handleFoundryAssetPackGet({ packId: "ghost" }, { packsRoot })).rejects.toThrow(
      /asset pack not found/i,
    );
  });

  it("throws when a file referenced by the manifest is missing on disk", async () => {
    writeFileSync(
      join(packsRoot, "rafe-v3", "manifest.json"),
      JSON.stringify({
        packId: "rafe-v3",
        kind: "character",
        slotId: "rafe.idle",
        promotedAt: "2026-05-25T12:00:00.000Z",
        files: [{ path: "missing.png", role: "primary" }],
      }),
    );
    await expect(handleFoundryAssetPackGet({ packId: "rafe-v3" }, { packsRoot })).rejects.toThrow(
      /asset pack file missing/i,
    );
  });

  describe("path-traversal attack vectors (security)", () => {
    it.each([
      ["plain traversal", "../../../etc/passwd"],
      ["URL-encoded traversal", "..%2f..%2fpasswd"],
      ["uppercase encoded traversal", "..%2F..%2Fpasswd"],
      ["encoded dot-dot", "%2e%2e/passwd"],
      ["mid-string traversal", "pack/../escape"],
      ["absolute path", "/absolute"],
      ["home expansion", "~/home"],
      ["empty string", ""],
      ["very long string (>256)", "a".repeat(257)],
      ["backslash traversal", "..\\..\\Windows"],
      ["hidden dotfile", ".ssh"],
      ["bare dot", "."],
    ])("rejects %s with a validation error (not a not-found error)", async (_label, evil) => {
      // We assert the error is a validation/safety error, not the
      // generic "asset pack not found" — that distinction matters because
      // the latter would mean the path was attempted on disk.
      await expect(
        handleFoundryAssetPackGet({ packId: evil }, { packsRoot }),
      ).rejects.toThrow(/(packId|outside packsRoot|empty|256|may not|encoded|must match|invalid)/i);
    });

    it("rejects a manifest-controlled file path that escapes the pack dir", async () => {
      // A malicious manifest tries to reference a path that walks back up
      // the tree. The resolver must refuse it even though the packId itself
      // is fine.
      writeFileSync(
        join(packsRoot, "rafe-v3", "manifest.json"),
        JSON.stringify({
          packId: "rafe-v3",
          kind: "character",
          slotId: "rafe.idle",
          promotedAt: "2026-05-25T12:00:00.000Z",
          files: [{ path: "../../../etc/passwd", role: "primary" }],
        }),
      );
      await expect(
        handleFoundryAssetPackGet({ packId: "rafe-v3" }, { packsRoot }),
      ).rejects.toThrow(/not safe|may not|outside/i);
    });

    // Defense-in-depth: a manifest file path may also carry encoded
    // traversal, backslashes, NUL, absolute paths, or tilde — the hand-rolled
    // check used to miss them. These should all be rejected uniformly via
    // the shared `assertPathSafeAgainstTraversal` helper.
    it.each([
      ["URL-encoded traversal", "..%2f..%2fpasswd"],
      ["uppercase encoded traversal", "..%2F..%2Fetc%2Fpasswd"],
      ["encoded dot-dot only", "%2e%2e/passwd"],
      ["backslash traversal", "..\\..\\Windows"],
      ["NUL byte", "evil\0.png"],
      ["leading slash (absolute)", "/etc/passwd"],
      ["leading tilde (home)", "~/.ssh/id_rsa"],
      ["mid-string traversal", "frames/../../escape.png"],
    ])("rejects manifest path with %s", async (_label, evilPath) => {
      writeFileSync(
        join(packsRoot, "rafe-v3", "manifest.json"),
        JSON.stringify({
          packId: "rafe-v3",
          kind: "character",
          slotId: "rafe.idle",
          promotedAt: "2026-05-25T12:00:00.000Z",
          files: [{ path: evilPath, role: "primary" }],
        }),
      );
      await expect(
        handleFoundryAssetPackGet({ packId: "rafe-v3" }, { packsRoot }),
      ).rejects.toThrow(/(not safe|may not|encoded|outside|traversal|NUL|backslash)/i);
    });
  });
});
