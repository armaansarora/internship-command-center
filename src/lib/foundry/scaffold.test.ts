// src/lib/foundry/scaffold.test.ts
import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

const FOUNDRY_SUBDIRS = [
  "src/lib/foundry/canon",
  "src/lib/foundry/asset-pack",
  "src/lib/foundry/agents",
  "src/lib/foundry/providers",
  "src/lib/foundry/cli",
  "docs/foundry/canon/characters",
  "docs/foundry/canon/palettes",
  "docs/foundry/canon/typography",
  "docs/foundry/canon/motion-language",
  "docs/foundry/canon/space-tokens",
  "docs/foundry/canon/iconography-rules",
  ".artlab/foundry",
];

describe("foundry scaffold", () => {
  for (const dir of FOUNDRY_SUBDIRS) {
    it(`directory exists: ${dir}`, () => {
      const full = join(REPO_ROOT, dir);
      expect(existsSync(full)).toBe(true);
      expect(statSync(full).isDirectory()).toBe(true);
    });
  }

  it("foundry CLI script exists", () => {
    expect(existsSync(join(REPO_ROOT, "scripts/foundry.ts"))).toBe(true);
  });
});
