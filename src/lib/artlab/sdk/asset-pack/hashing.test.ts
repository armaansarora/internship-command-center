import { describe, expect, it } from "vitest";
import { sha256OfBytes, sha256OfFile } from "./hashing";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("sha256 helpers", () => {
  it("returns the expected hex digest for an empty buffer", () => {
    const empty = Buffer.alloc(0);
    expect(sha256OfBytes(empty)).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("returns the same digest for the same input", () => {
    const buf = Buffer.from("hello artlab");
    expect(sha256OfBytes(buf)).toBe(sha256OfBytes(buf));
  });

  it("hashes a file from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "artlab-sha-"));
    const f = join(dir, "blob.bin");
    writeFileSync(f, Buffer.from("hello artlab"));
    try {
      expect(await sha256OfFile(f)).toBe(sha256OfBytes(Buffer.from("hello artlab")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("always returns lowercase hex", () => {
    expect(sha256OfBytes(Buffer.from("X"))).toMatch(/^[a-f0-9]{64}$/);
  });
});
