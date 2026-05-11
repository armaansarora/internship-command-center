/**
 * ConciergeFlow smoke test.
 *
 * The full flow (claim → cinematic → Otis → extract → bootstrap → redirect)
 * is exercised end-to-end by the R4.11 Proof test. This smoke-level file
 * only asserts that the orchestrator component renders without throwing
 * and exposes the correct phase attribute on its root, so a refactor that
 * breaks the static shape gets caught at CI time.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("./actions", () => ({
  claimArrivalPlayAction: vi.fn().mockResolvedValue({
    ok: true,
    shouldPlayCinematic: false,
  }),
  exitLobbyToPenthouse: vi.fn(),
}));

import { ConciergeFlow } from "./ConciergeFlow";

describe("R4.4 ConciergeFlow", () => {
  it("renders the lobby onboarding wrapper with a data-phase attribute", () => {
    const html = renderToStaticMarkup(
      <ConciergeFlow
        arrivalAlreadyPlayed
        floorsUnlocked={["L"]}
        guestName=""
      />,
    );
    expect(html).toContain('aria-label="Lobby onboarding"');
    expect(html).toMatch(/data-phase="/);
  });

  it("does not mount the Building Directory inside the intake page", () => {
    const html = renderToStaticMarkup(
      <ConciergeFlow
        arrivalAlreadyPlayed
        floorsUnlocked={["L", "7", "PH"]}
        guestName="Armaan"
      />,
    );
    expect(html).not.toMatch(/Building Directory/i);
  });

  it("renders a structured intake desk instead of a chat-only onboarding surface", () => {
    const html = renderToStaticMarkup(
      <ConciergeFlow
        arrivalAlreadyPlayed
        floorsUnlocked={["L"]}
        guestName="Armaan"
      />,
    );

    expect(html).toContain("Target roles");
    expect(html).toContain("Work authorization");
    expect(html).toContain("Resume status");
    expect(html).toContain("Gmail &amp; Calendar");
    expect(html).toContain("Save progress");
    expect(html).toContain("Skip for now");
    expect(html).toContain("What this powers");
  });
});
