import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("tower CLI smoke", () => {
  it("prints 'tower alive' on hello", async () => {
    const { stdout } = await runCLI(["hello"]);
    expect(stdout).toBe("tower alive");
  });

  it("prints version on --version", async () => {
    const { stdout } = await runCLI(["--version"]);
    expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
