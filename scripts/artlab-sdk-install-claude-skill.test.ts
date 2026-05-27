import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeArtLabClaudeSkillTarget, installArtLabClaudeSkill } from "./artlab-sdk-install-claude-skill";

let claudeHome: string;

beforeEach(() => {
  claudeHome = mkdtempSync(join(tmpdir(), "claude-skill-"));
});

describe("installArtLabClaudeSkill", () => {
  it("computeArtLabClaudeSkillTarget returns ~/.claude/skills/artlab/SKILL.md by default", () => {
    const target = computeArtLabClaudeSkillTarget({ claudeHome });
    expect(target).toBe(join(claudeHome, "skills", "artlab", "SKILL.md"));
  });

  it("installArtLabClaudeSkill writes the SKILL.md when confirmed", async () => {
    await installArtLabClaudeSkill({
      claudeHome,
      repoRoot: "/r",
      confirm: () => Promise.resolve(true),
    });
    const written = readFileSync(join(claudeHome, "skills", "artlab", "SKILL.md"), "utf8");
    expect(written).toMatch(/^---\nname: artlab/);
  });

  it("installArtLabClaudeSkill aborts when user declines", async () => {
    await installArtLabClaudeSkill({
      claudeHome,
      repoRoot: "/r",
      confirm: () => Promise.resolve(false),
    });
    expect(existsSync(join(claudeHome, "skills", "artlab", "SKILL.md"))).toBe(false);
  });

  it("backs up an existing SKILL.md to SKILL.md.bak before overwriting", async () => {
    const target = join(claudeHome, "skills", "artlab", "SKILL.md");
    mkdirSync(join(claudeHome, "skills", "artlab"), { recursive: true });
    writeFileSync(target, "PREVIOUS");
    await installArtLabClaudeSkill({
      claudeHome,
      repoRoot: "/r",
      confirm: () => Promise.resolve(true),
    });
    expect(readFileSync(`${target}.bak`, "utf8")).toBe("PREVIOUS");
  });
});
