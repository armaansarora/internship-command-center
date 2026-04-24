// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { TurnScoreBadge } from "./TurnScoreBadge";

interface Mounted { host: HTMLDivElement; root: Root; unmount: () => void }

function mount(node: React.ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(node); });
  return {
    host, root,
    unmount: () => { act(() => { root.unmount(); }); host.remove(); },
  };
}

let cleanups: Array<() => void> = [];
afterEach(() => { cleanups.forEach((fn) => fn()); cleanups = []; });

describe("R10.13 TurnScoreBadge", () => {
  it("renders three axis labels (A / C / W) with dot fills matching scores", () => {
    const m = mount(
      <TurnScoreBadge
        round={1}
        scoring={{
          anchorScore: 4, concessionScore: 2, walkawayScore: 0,
          critique: "Good anchor hold. Consider addressing start date.",
        }}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector("[data-testid='turn-score-badge']");
    expect(badge).not.toBeNull();
    const dots = m.host.querySelectorAll("[data-axis][data-filled]");
    expect(dots.length).toBe(15);
    const filled = m.host.querySelectorAll("[data-filled='true']");
    expect(filled.length).toBe(6);
  });

  it("displays the critique text", () => {
    const m = mount(
      <TurnScoreBadge
        round={2}
        scoring={{ anchorScore: 3, concessionScore: 3, walkawayScore: 3, critique: "Solid midgame." }}
      />,
    );
    cleanups.push(m.unmount);
    expect(m.host.textContent).toContain("Solid midgame.");
  });

  it("has aria-label summarizing the scores for assistive tech", () => {
    const m = mount(
      <TurnScoreBadge
        round={3}
        scoring={{ anchorScore: 5, concessionScore: 4, walkawayScore: 3, critique: "Clean close." }}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector("[data-testid='turn-score-badge']");
    const label = badge?.getAttribute("aria-label");
    expect(label).toContain("Round 3");
    expect(label).toContain("anchor 5");
    expect(label).toContain("concession 4");
    expect(label).toContain("walkaway 3");
  });
});
