// @vitest-environment happy-dom

import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Activation-gauntlet proof: the CIO has been folded out of the visible
 * Rolodex Lounge cast. The character + whiteboard + dialogue panel must
 * not render, and the file itself must no longer import them so a future
 * refactor can't accidentally re-surface them through a stale prop.
 *
 * The CIO AGENT BACKEND (src/lib/agents/cio/*) is intentionally NOT
 * exercised here — this PR is the cosmetic removal step, not the
 * functional one. AgentArch folds CIO into CRO + CNO in a later pass.
 */

vi.mock("next/dynamic", () => ({
  default: () =>
    function NoopModal() {
      return null;
    },
}));

vi.mock("@/styles/floor-6.css", () => ({}));

vi.mock("./RolodexLoungeScene", () => ({
  RolodexLoungeScene: ({
    characterSlot,
    tableSlot,
  }: {
    characterSlot?: React.ReactNode;
    tableSlot?: React.ReactNode;
  }) => (
    <div data-testid="scene">
      <div data-testid="character-slot">{characterSlot}</div>
      <div data-testid="table-slot">{tableSlot}</div>
    </div>
  ),
}));

vi.mock("./cno-character/CNOCharacter", () => ({
  CNOCharacter: () => <div data-testid="cno-character">CNO Character</div>,
}));

vi.mock("./cno-character/CNODialoguePanel", () => ({
  CNODialoguePanel: () => null,
}));

vi.mock("./cno-character/CNOWhiteboard", () => ({
  CNOWhiteboard: () => <div data-testid="cno-whiteboard">CNO Whiteboard</div>,
}));

vi.mock("./crud/ContactSearch", () => ({
  ContactSearch: () => <div data-testid="contact-search" />,
}));

vi.mock("./rolodex/Rolodex", () => ({
  Rolodex: () => <div data-testid="rolodex" />,
}));

import { RolodexLoungeClient } from "./RolodexLoungeClient";

describe("RolodexLoungeClient — CIO removal", () => {
  const noopAsync = async () => undefined;

  it("does not render any CIO-labeled element in the visible markup", () => {
    const html = renderToStaticMarkup(
      <RolodexLoungeClient
        contacts={[]}
        contactStats={{
          total: 0,
          warm: 0,
          cooling: 0,
          cold: 0,
          companiesRepresented: 0,
          recentActivity: 0,
        }}
        companies={[]}
        onCreateContact={noopAsync}
        onUpdateContact={noopAsync}
        onDeleteContact={noopAsync}
      />,
    );

    // No CIO substring anywhere in the rendered HTML.
    expect(html).not.toMatch(/CIO/);
    // CNO surface still mounts so the floor isn't empty.
    expect(html).toMatch(/CNO Character/);
    expect(html).toMatch(/CNO Whiteboard/);
  });

  it("file no longer imports cio-character siblings", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "src/components/floor-6/RolodexLoungeClient.tsx",
      ),
      "utf8",
    );

    expect(src).not.toMatch(/from "\.\/cio-character\/CIOCharacter"/);
    expect(src).not.toMatch(/from "\.\/cio-character\/CIODialoguePanel"/);
    expect(src).not.toMatch(/from "\.\/cio-character\/CIOWhiteboard"/);
  });

  it("rolodex-lounge page no longer derives CIO research stats", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(authenticated)/rolodex-lounge/page.tsx",
      ),
      "utf8",
    );

    // Specific CIO-research artifacts must be absent. Generic words like
    // "researched" survive in markdown comments elsewhere; the test pins
    // the explicit symbol names that used to live in the page.
    expect(src).not.toMatch(/researchStats/);
    expect(src).not.toMatch(/CIOWhiteboard/);
    expect(src).not.toMatch(/research_freshness/);
  });
});
