import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const runtimePromptFiles = [
  ["src/lib/agents/ceo/system-prompt.ts", "Mara Voss"],
  ["src/lib/agents/cro/system-prompt.ts", "Rafe Calder"],
  ["src/lib/agents/cfo/system-prompt.ts", "Priya Sen"],
  ["src/lib/agents/coo/system-prompt.ts", "Dylan Shorts"],
  ["src/lib/agents/cmo/system-prompt.ts", "Vera Bloom"],
  ["src/lib/agents/cno/system-prompt.ts", "Sol Navarro"],
  ["src/lib/agents/cpo/system-prompt.ts", "Dr. Inez Park"],
  ["src/lib/agents/cio/system-prompt.ts", "Mina Rook"],
  ["src/lib/agents/concierge/system-prompt.ts", "Otis Vale"],
  ["src/lib/agents/offer-evaluator/system-prompt.ts", "Nadia Flint"],
] as const;

describe("runtime prompt identities", () => {
  it("names every Season 1 runtime persona from the character bible", () => {
    for (const [file, name] of runtimePromptFiles) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).toContain(name);
    }
  });

  it("does not use named fictional-character shorthand in live prompts", () => {
    const followUpDraftPrompt = readFileSync(
      join(process.cwd(), "src/lib/ai/structured/follow-up-draft.ts"),
      "utf8",
    );

    expect(followUpDraftPrompt).not.toContain("Walter White");
  });
});
