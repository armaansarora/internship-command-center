import { describe, expect, it } from "vitest";
import { runCanonValidateSubcommand } from "./canon-validate";
import { join } from "node:path";

describe("artlab sdk canon validate CLI", () => {
  it("exits 0 with 'canon ok' on the real canon root", async () => {
    const lines: string[] = [];
    const code = await runCanonValidateSubcommand({
      canonRoot: join(process.cwd(), "docs/artlab/sdk/canon"),
      stdout: (s) => lines.push(s),
      stderr: (s) => lines.push(s),
    });
    expect(code).toBe(0);
    expect(lines.at(-1)?.trim()).toBe("canon ok");
  });

  it("exits 1 and prints issues on a broken canon root", async () => {
    const lines: string[] = [];
    const code = await runCanonValidateSubcommand({
      canonRoot: "/tmp/artlab-canon-nonexistent-9999",
      stdout: (s) => lines.push(s),
      stderr: (s) => lines.push(s),
    });
    expect(code).toBe(1);
    expect(lines.join("\n")).toMatch(/canon-empty|issues/i);
  });
});
