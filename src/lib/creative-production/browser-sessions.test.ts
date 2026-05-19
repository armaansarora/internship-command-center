import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCreativeBrowserSessionPlan,
  renderCreativeBrowserSessionRunbook,
} from "./index";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("creative browser sessions", () => {
  it("creates an isolated Gemini browser profile instead of targeting daily Chrome", () => {
    const plan = createCreativeBrowserSessionPlan({
      sessionId: "gemini-art-studio",
      artlabRoot: ".artlab",
      provider: "gemini",
      browserExecutablePath: "/tmp/chrome-for-testing",
      remoteDebuggingPort: 9227,
    });

    expect(plan.provider).toBe("gemini");
    expect(plan.engine).toBe("playwright-chromium");
    expect(plan.browserUrl).toBe("https://gemini.google.com/app");
    expect(plan.browserExecutablePath).toBe("/tmp/chrome-for-testing");
    expect(plan.profileDirectory).toContain(".artlab/browser-sessions/gemini-art-studio/browser-profile");
    expect(plan.downloadDirectory).toContain(".artlab/browser-sessions/gemini-art-studio/downloads");
    expect(plan.launchCommand).toContain(`--user-data-dir=${plan.profileDirectory}`);
    expect(plan.launchCommand).toContain("--remote-debugging-port=9227");
    expect(plan.launchCommand[0]).toBe("/tmp/chrome-for-testing");
    expect(plan.scalingPolicy.trueParallelGenerationPath).toBe("api-adapter-required");
    expect(plan.scalingPolicy.subscriptionUiMaxInteractiveSessions).toBe(2);
    expect(plan.isolationRules.join(" ")).toContain("daily Chrome");
  });

  it("rejects unsafe main-profile session names", () => {
    expect(() => createCreativeBrowserSessionPlan({ sessionId: "main" })).toThrow("main");
    expect(() => createCreativeBrowserSessionPlan({ sessionId: "personal-gemini" })).toThrow("personal");
    expect(() => createCreativeBrowserSessionPlan({ sessionId: "default-profile" })).toThrow("default");
  });

  it("renders a runbook that states the scaling reality", () => {
    const runbook = renderCreativeBrowserSessionRunbook(createCreativeBrowserSessionPlan({
      sessionId: "gemini-art-studio",
      browserExecutablePath: "/tmp/chrome-for-testing",
    }));

    expect(runbook).toContain("never hijacks Armaan's daily Chrome");
    expect(runbook).toContain("Playwright Chromium");
    expect(runbook).toContain("True unattended five-lane image generation requires an API adapter");
    expect(runbook).toContain("batch review boards");
  });

  it("CLI creates browser session artifacts without launching by default", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-browser-"));
    const output = execFileSync(tsx, [
      "scripts/creative-browser-session.ts",
      "plan",
      "--session",
      "gemini-art-studio",
      "--provider",
      "gemini",
      "--artlab-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Created isolated creative browser session");
    expect(output).toContain("do not use Armaan's daily Chrome");
    expect(output).toContain("Engine: playwright-chromium");

    const sessionRoot = join(root, "browser-sessions", "gemini-art-studio");
    expect(existsSync(join(sessionRoot, "browser-session.json"))).toBe(true);
    expect(existsSync(join(sessionRoot, "browser-session-runbook.md"))).toBe(true);

    const plan = JSON.parse(readFileSync(join(sessionRoot, "browser-session.json"), "utf8")) as {
      engine: string;
      launchCommandText: string;
      scalingPolicy: { trueParallelGenerationPath: string };
    };

    expect(plan.engine).toBe("playwright-chromium");
    expect(plan.launchCommandText).toContain("--user-data-dir=");
    expect(plan.launchCommandText).not.toContain("'open'");
    expect(plan.scalingPolicy.trueParallelGenerationPath).toBe("api-adapter-required");
  });
});
