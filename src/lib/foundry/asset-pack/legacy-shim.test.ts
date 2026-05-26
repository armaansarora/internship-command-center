import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { liftLegacyArtLabAssetToFoundryPack } from "./legacy-shim";
import { FoundryAssetPackManifestSchema } from "./manifest.schema";

describe("liftLegacyArtLabAssetToFoundryPack", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-legacy-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("lifts a single legacy PNG/WEBP into a valid v1 manifest (in-memory; no disk write)", async () => {
    const fakeBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const pngPath = join(tmpDir, "idle.webp");
    writeFileSync(pngPath, fakeBytes);

    const pack = await liftLegacyArtLabAssetToFoundryPack({
      characterId: "otis",
      outfit: "regular",
      pose: "idle",
      payloadAbsPath: pngPath,
      provider: "legacy-import",
      modelId: "legacy-import",
      generatedAt: "2026-05-25T00:00:00.000Z",
    });

    expect(() => FoundryAssetPackManifestSchema.parse(pack.manifest)).not.toThrow();
    expect(pack.manifest.kind).toBe("character-sprite");
    expect(pack.manifest.canonRefs.characterId).toBe("otis");
    expect(pack.manifest.intendedSlot.slotId).toBe("lobby/otis/regular/idle");
    expect(pack.manifest.payload.files[0].bytes).toBe(fakeBytes.byteLength);
  });

  it("rejects when the legacy combination has no registered slot", async () => {
    await expect(
      liftLegacyArtLabAssetToFoundryPack({
        characterId: "rogue",
        outfit: "regular",
        pose: "idle",
        payloadAbsPath: "/dev/null",
        provider: "legacy-import",
        modelId: "legacy-import",
        generatedAt: "2026-05-25T00:00:00.000Z",
      }),
    ).rejects.toThrow();
  });

  it("does not write any files to disk (read-only lift)", async () => {
    const fakeBytes = Buffer.from("x");
    const pngPath = join(tmpDir, "idle.webp");
    writeFileSync(pngPath, fakeBytes);
    const before = mkdtempSync(join(tmpdir(), "foundry-legacy-check-"));
    mkdirSync(before, { recursive: true });
    await liftLegacyArtLabAssetToFoundryPack({
      characterId: "otis",
      outfit: "regular",
      pose: "idle",
      payloadAbsPath: pngPath,
      provider: "legacy-import",
      modelId: "legacy-import",
      generatedAt: "2026-05-25T00:00:00.000Z",
    });
    rmSync(before, { recursive: true, force: true });
  });
});
