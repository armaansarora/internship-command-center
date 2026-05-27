import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as yamlStringify } from "yaml";

const CANON_ROOT = join(process.cwd(), "docs/artlab/sdk/canon");

function listAllYaml(root: string): string[] {
  const dirs = readdirSync(root, { withFileTypes: true });
  const acc: string[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const subPath = join(root, d.name);
    const subEntries = readdirSync(subPath, { withFileTypes: true });
    for (const e of subEntries) {
      if (e.isFile() && (e.name.endsWith(".yaml") || e.name.endsWith(".yml"))) {
        acc.push(join(subPath, e.name));
      }
    }
  }
  return acc;
}

describe("canon YAML round-trip stability", () => {
  it("parses then re-stringifies every canon file without losing data", () => {
    const files = listAllYaml(CANON_ROOT);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const raw = readFileSync(f, "utf8");
      const parsedOnce = parseYaml(raw);
      const restringified = yamlStringify(parsedOnce);
      const parsedTwice = parseYaml(restringified);
      expect(parsedTwice, `round-trip drift in ${f}`).toEqual(parsedOnce);
    }
  });
});
