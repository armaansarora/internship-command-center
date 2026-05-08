import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LobbyClient } from "./lobby-client";

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/lib/gsap-init", () => ({
  gsap: {
    timeline: () => ({
      fromTo: () => ({
        fromTo: () => ({ kill: vi.fn() }),
        kill: vi.fn(),
      }),
      kill: vi.fn(),
    }),
  },
}));

vi.mock("@/components/world/Elevator", () => ({
  Elevator: () => <nav aria-label="Floor navigation" />,
}));

vi.mock("@/components/world/LobbyBackground", () => ({
  LobbyBackground: () => <div data-testid="lobby-background" />,
}));

describe("LobbyClient", () => {
  it("keeps the first sign-in surface decorative instead of rendering explainer cards", () => {
    const html = renderToStaticMarkup(<LobbyClient />);

    expect(html).toContain("The Tower");
    expect(html).toContain("Continue with Google");
    expect(html).not.toContain("Front desk");
    expect(html).not.toContain("Otis intake");
    expect(html).not.toContain("Elevator");
    expect(html).not.toContain("PRIVATE BETA");
  });
});
