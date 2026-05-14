import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const canonicalCharacters = [
  { id: "otis", name: "Otis Vale", promptRef: "art-bible:otis-character-bible-v1" },
  { id: "ceo", name: "Mara Voss", promptRef: "art-bible:mara-voss-character-bible-v1" },
  { id: "cro", name: "Rafe Calder", promptRef: "art-bible:rafe-calder-character-bible-v1" },
  { id: "cfo", name: "Priya Sen", promptRef: "art-bible:priya-sen-character-bible-v1" },
  { id: "coo", name: "Dylan Shorts", promptRef: "art-bible:dylan-shorts-character-bible-v1" },
  { id: "cmo", name: "Vera Bloom", promptRef: "art-bible:vera-bloom-character-bible-v1" },
  { id: "cno", name: "Sol Navarro", promptRef: "art-bible:sol-navarro-character-bible-v1" },
  { id: "cpo", name: "Dr. Inez Park", promptRef: "art-bible:inez-park-character-bible-v1" },
  { id: "cio", name: "Mina Rook", promptRef: "art-bible:mina-rook-character-bible-v1" },
  { id: "trust", name: "Etta Knox", promptRef: "art-bible:etta-knox-character-bible-v1" },
  { id: "archivist", name: "Rowan Vale", promptRef: "art-bible:rowan-vale-character-bible-v1" },
  { id: "red-team", name: "Nadia Flint", promptRef: "art-bible:nadia-flint-character-bible-v1" },
] as const;

const requiredCharacterFields = [
  "Origin:",
  "Defining wound:",
  "Tower entry:",
  "Why they stayed:",
  "Role doctrine:",
  "Flaw:",
  "Secret strength:",
  "Comedic engine:",
  "Relationships:",
  "Visual DNA:",
  "Forbidden visual traits:",
  "Prompt fragments:",
] as const;

describe("Season 1 character image foundation", () => {
  it("locks the full character bible to the approved Season 1 cast and fields", () => {
    const bible = readFileSync(join(process.cwd(), "docs/CHARACTER-BIBLE.md"), "utf8");
    const artBible = readFileSync(join(process.cwd(), "docs/ART-BIBLE.md"), "utf8");
    const visualAssetTypes = readFileSync(
      join(process.cwd(), "src/lib/visual-assets/types.ts"),
      "utf8",
    );

    expect(bible).toContain("Style: tower-flat-plus-depth-v1");
    expect(bible).toContain("Story tone: Professional Scars");
    expect(bible).toContain("Runtime mapping: Nadia Flint is the production persona for the Offer Evaluator");

    for (const character of canonicalCharacters) {
      expect(bible).toContain(`### ${character.name}`);
      expect(bible).toContain(`characterId: ${character.id}`);
      expect(bible).toContain(character.promptRef);
      expect(artBible).toContain(character.promptRef);
      expect(visualAssetTypes).toContain(`"${character.id}"`);
    }

    for (const field of requiredCharacterFields) {
      expect(bible.match(new RegExp(field, "g"))?.length).toBe(canonicalCharacters.length);
    }
  });

  it("documents the approval-gated image pipeline before production assets exist", () => {
    const pipeline = readFileSync(
      join(process.cwd(), "docs/CHARACTER-ART-PIPELINE.md"),
      "utf8",
    );

    expect(pipeline).toContain("tower-flat-plus-depth-v1");
    expect(pipeline).toContain("ChatGPT image generation");
    expect(pipeline).toContain("Do not switch to paid API generation");
    expect(pipeline).toContain(".artlab/characters/<characterId>/");
    expect(pipeline).toContain("public/art/<space>/<characterId>/<outfitVariant>/<pose>.webp");

    expect(pipeline).toContain("Initial character design approval");
    expect(pipeline).toContain("Final upload-ready board approval");
    expect(pipeline).toContain("not new Armaan approval gates");
    expect(pipeline).toContain("createCharacterArtRunPlan()");
    expect(pipeline).toContain("approved-character-assets.generated.json");

    for (const gate of [
      "Gate 1: Character bible readiness",
      "Gate 2: Exactly 12 concept options, one winner",
      "Gate 3: Batch production packet",
      "Gate 4: Pose sheets",
      "Gate 5: Scripted source ingest and splitting",
      "Gate 6: Master, derivative, and automated QA",
      "Gate 7: Final upload-ready board",
      "Gate 8: Promotion and app preview",
    ]) {
      expect(pipeline).toContain(gate);
    }

    for (const outfitVariant of ["regular", "summer-light", "winter-layered"]) {
      expect(pipeline).toContain(outfitVariant);
    }

    for (const pose of ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"]) {
      expect(pipeline).toContain(pose);
    }
  });

  it("keeps generation-facing character canon free of named likeness anchors", () => {
    const generationCanon = [
      readFileSync(join(process.cwd(), "docs/CHARACTER-BIBLE.md"), "utf8"),
      readFileSync(join(process.cwd(), "docs/ART-BIBLE.md"), "utf8"),
      readFileSync(join(process.cwd(), "docs/CHARACTER-ART-PIPELINE.md"), "utf8"),
    ].join("\n");

    for (const bannedAnchor of [
      "Jessica Pearson",
      "Claire Underwood",
      "Walter White",
    ]) {
      expect(generationCanon).not.toContain(bannedAnchor);
    }
  });

  it("keeps existing character prompt names aligned with the Season 1 bible", () => {
    const prompts = readFileSync(join(process.cwd(), "docs/CHARACTER-PROMPTS.md"), "utf8");

    for (const name of [
      "Mara Voss",
      "Rafe Calder",
      "Nadia Flint",
      "Dylan Shorts",
      "Mina Rook",
      "Vera Bloom",
      "Dr. Inez Park",
      "Sol Navarro",
      "Priya Sen",
      "Otis Vale",
    ]) {
      expect(prompts).toContain(`**Name:** ${name}`);
    }

    expect(prompts).not.toContain("**Name:** TBD");
  });

  it("locks the ensemble relationship canon for cross-floor scenes", () => {
    const relationships = readFileSync(
      join(process.cwd(), "docs/CHARACTER-RELATIONSHIPS.md"),
      "utf8",
    );

    for (const character of canonicalCharacters) {
      expect(relationships).toContain(character.name);
    }

    for (const engine of [
      "Case File Relay",
      "Morning Briefing Interruptions",
      "Approval Drama",
      "Elevator Confessionals",
      "Board Meeting",
      "Consent and Consequence",
    ]) {
      expect(relationships).toContain(engine);
    }
  });
});
