import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { storeReferenceImage, listReferenceImages } from "./reference-attachment";

describe("reference attachment store", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-ref-")); });

  it("stores a reference image with metadata", async () => {
    const bytes = Buffer.from("PNG-bytes-here");
    const stored = await storeReferenceImage(runDir, { sourceLabel: "telegram-photo-1", contentType: "image/png", bytes });
    expect(existsSync(stored.absolutePath)).toBe(true);
    expect(readFileSync(stored.absolutePath)).toEqual(bytes);
    const list = listReferenceImages(runDir);
    expect(list.length).toBe(1);
    expect(list[0]!.sourceLabel).toBe("telegram-photo-1");
  });

  it("returns empty when no references stored", () => {
    expect(listReferenceImages(runDir)).toEqual([]);
  });
});
