import { describe, expect, it } from "vitest";
import { artlabCliEntry, ARTLAB_SUBCOMMANDS } from "./artlab";

describe("artlab CLI shell", () => {
  it("declares all subcommands", () => {
    expect(ARTLAB_SUBCOMMANDS).toEqual([
      "produce",
      "continue",
      "answer",
      "status",
      "queue",
      "health",
      "doctor",
      "show",
      "cancel",
      "daemon",
      "bot",
      "run-worker",
      "smoke",
      "help",
    ]);
  });

  it("entry returns exit-code 2 with no args", async () => {
    const code = await artlabCliEntry({ argv: [], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(2);
  });

  it("entry returns exit-code 0 for help", async () => {
    const code = await artlabCliEntry({ argv: ["help"], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(0);
  });

  it.each([["--help"], ["-h"]])(
    "entry returns exit-code 0 for %s (alias of help) with matching output",
    async (flag) => {
      const helpLines: string[] = [];
      const helpCode = await artlabCliEntry({
        argv: ["help"],
        stdout: (s) => helpLines.push(s),
        stderr: () => {},
      });
      expect(helpCode).toBe(0);
      const aliasLines: string[] = [];
      const aliasCode = await artlabCliEntry({
        argv: [flag],
        stdout: (s) => aliasLines.push(s),
        stderr: () => {},
      });
      expect(aliasCode).toBe(0);
      expect(aliasLines.join("\n")).toBe(helpLines.join("\n"));
    },
  );

  it("entry returns exit-code 2 for unknown subcommand", async () => {
    const code = await artlabCliEntry({ argv: ["dance"], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(2);
  });

  it("entry returns exit-code 2 for the (now-removed) migrate subcommand", async () => {
    const code = await artlabCliEntry({ argv: ["migrate"], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(2);
  });

  it("produce returns exit-code 0 and prints an acknowledgement", async () => {
    const tmpRoot = `/tmp/artlab-cli-test-${Date.now()}`;
    process.env.ARTLAB_WORKSPACE_ROOT = tmpRoot;
    const lines: string[] = [];
    const code = await artlabCliEntry({
      argv: ["produce", "make Rafe"],
      stdout: (s) => lines.push(s),
      stderr: () => {},
    });
    delete process.env.ARTLAB_WORKSPACE_ROOT;
    expect(code).toBe(0);
    expect(lines.join("\n")).toMatch(/queued|produce/i);
  });
});
