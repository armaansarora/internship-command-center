/**
 * R4.2 — Otis character primitives.
 *
 * Locks the contract that Otis is a NEW named character distinct from
 * every C-suite agent. The cover-the-name test: looking at Otis without
 * the label, a reader must not mistake him for the CEO, CPO, CFO, etc.
 * We enforce this mechanically by asserting:
 *
 *   1. The burgundy accent color is applied to the dialogue panel, not
 *      the gold the C-suite uses. A grep on `#C9A84C` or `rgba(201, 168, 76` within
 *      Otis files would be a tell — we assert their absence.
 *   2. The character root carries `data-character="otis"` so route-level
 *      tests and integration checks can identify him without heuristics.
 *   3. The dialogue panel does not import any C-suite character file.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OtisCharacter } from "./OtisCharacter";
import { OtisDialoguePanel } from "./OtisDialoguePanel";

const otisFiles = [
  "src/components/lobby/concierge/OtisCharacter.tsx",
  "src/components/lobby/concierge/OtisAvatar.tsx",
  "src/components/lobby/concierge/OtisDialoguePanel.tsx",
];

describe("R4.2 Otis primitives", () => {
  it("identifies itself as Otis via data-character", () => {
    const html = renderToStaticMarkup(<OtisCharacter />);
    expect(html).toContain('data-character="otis"');
  });

  it("does not reuse the gold C-suite accent palette", () => {
    // None of Otis's source files may reference the gold hex #C9A84C
    // (the C-suite brand color) or its rgba variant. If a designer
    // tries to copy a CEO/CPO template into an Otis file, this fails.
    for (const rel of otisFiles) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(src.toLowerCase()).not.toContain("#c9a84c");
      expect(src).not.toMatch(/rgba\(\s*201\s*,\s*168\s*,\s*76/);
    }
  });

  it("does not import any C-suite character component", () => {
    // Otis must not subclass, alias, or re-export CEOCharacter/CPOCharacter/etc.
    const banned = [
      /from\s+["']@\/components\/floor-\d+\//,
      /CEOCharacter|CPOCharacter|CFOCharacter|CMOCharacter|COOCharacter|CROCharacter|CIOCharacter|CNOCharacter/,
    ];
    for (const rel of otisFiles) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      for (const pattern of banned) {
        expect(src).not.toMatch(pattern);
      }
    }
  });

  it("renders a dialogue panel with the burgundy accent", () => {
    const html = renderToStaticMarkup(
      <OtisDialoguePanel
        messages={[]}
        status="idle"
        onSubmit={() => undefined}
        input=""
        onInputChange={() => undefined}
        onSkip={() => undefined}
        canSkip
      />
    );
    // Burgundy = #6B2A2E (per design doc §1.2).
    expect(html.toLowerCase()).toContain("#6b2a2e");
  });

  it("shows a honored Skip affordance on the panel when canSkip=true", () => {
    const html = renderToStaticMarkup(
      <OtisDialoguePanel
        messages={[]}
        status="idle"
        onSubmit={() => undefined}
        input=""
        onInputChange={() => undefined}
        onSkip={() => undefined}
        canSkip
      />
    );
    expect(html).toMatch(/skip/i);
  });

  it("hides the Skip affordance when canSkip=false", () => {
    const html = renderToStaticMarkup(
      <OtisDialoguePanel
        messages={[]}
        status="idle"
        onSubmit={() => undefined}
        input=""
        onInputChange={() => undefined}
        onSkip={() => undefined}
        canSkip={false}
      />
    );
    expect(html).not.toMatch(/aria-label="Skip the Concierge"/i);
  });
});
