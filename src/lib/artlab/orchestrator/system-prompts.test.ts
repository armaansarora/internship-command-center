// src/lib/artlab/orchestrator/system-prompts.test.ts
//
// Pins the identity-anchor sentence into the brain system prompt that
// authors concept lane variations. Without this, the brain is free to
// drift identity across lanes (different age, hair, face).

import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPTS_BY_KIND } from "./system-prompts";

const IDENTITY_ANCHOR = "Match exact face/hair/skin/age/proportions/palette from canon. Vary ONLY styling/wardrobe/pose — never identity.";

describe("SYSTEM_PROMPTS_BY_KIND — identity anchor", () => {
  it("generate-concept-prompts contains the byte-identical canon identity anchor", () => {
    expect(SYSTEM_PROMPTS_BY_KIND["generate-concept-prompts"]).toContain(IDENTITY_ANCHOR);
  });
});
