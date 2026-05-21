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
      "cancel",
      "daemon",
      "bot",
      "migrate",
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

  it("entry returns exit-code 2 for unknown subcommand", async () => {
    const code = await artlabCliEntry({ argv: ["dance"], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(2);
  });

  it("stub produce returns exit-code 0 and prints a banner", async () => {
    const lines: string[] = [];
    const code = await artlabCliEntry({
      argv: ["produce", "make Rafe"],
      stdout: (s) => lines.push(s),
      stderr: () => {},
    });
    expect(code).toBe(0);
    expect(lines.join("\n")).toMatch(/artlab produce: stub/i);
  });
});
