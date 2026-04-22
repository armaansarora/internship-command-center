import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";

const CLI = path.join(process.cwd(), "scripts/tower/index.ts");

describe("tower CLI smoke", () => {
  it("prints 'tower alive' on hello", async () => {
    const { stdout } = await execa("npx", ["tsx", CLI, "hello"]);
    expect(stdout).toBe("tower alive");
  });

  it("prints version on --version", async () => {
    const { stdout } = await execa("npx", ["tsx", CLI, "--version"]);
    expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
