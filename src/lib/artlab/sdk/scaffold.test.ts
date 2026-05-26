// src/lib/artlab/sdk/scaffold.test.ts
import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

const ARTLAB_SUBDIRS = [
  "src/lib/artlab/sdk/canon",
  "src/lib/artlab/sdk/asset-pack",
  "src/lib/artlab/sdk/agents",
  "src/lib/artlab/sdk/providers",
  "src/lib/artlab/sdk/cli",
  "docs/foundry/canon/characters",
  "docs/foundry/canon/palettes",
  "docs/foundry/canon/typography",
  "docs/foundry/canon/motion-language",
  "docs/foundry/canon/space-tokens",
  "docs/foundry/canon/iconography-rules",
  ".artlab/sdk",
];

describe("artlab sdk scaffold", () => {
  for (const dir of ARTLAB_SUBDIRS) {
    it(`directory exists: ${dir}`, () => {
      const full = join(REPO_ROOT, dir);
      expect(existsSync(full)).toBe(true);
      expect(statSync(full).isDirectory()).toBe(true);
    });
  }

  it("artlab sdk CLI script exists", () => {
    expect(existsSync(join(REPO_ROOT, "scripts/foundry.ts"))).toBe(true);
  });
});
