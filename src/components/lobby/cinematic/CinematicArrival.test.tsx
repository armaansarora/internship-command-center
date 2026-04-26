// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// React 19 + happy-dom requires the act-environment flag so root.render +
// effect flushes inside act() are applied synchronously in tests.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CinematicArrival render tests.
 *
 * The server decides whether the cinematic has already played by calling
 * `claimArrivalPlay(userId)` (R4.3) and passes the boolean down as
 * `arrivalAlreadyPlayed`. The component itself is the second gate — when
 * the prop is true it must return null with zero side effects (no DOM, no
 * GSAP wiring, no timers, no skip button). That's the whole point of
 * "one-time-per-account".
 *
 * We also verify the skip-button wiring (always rendered when not-yet-played)
 * and the reduced-motion collapse (completes immediately on mount).
 *
 * No @testing-library in this project, so we use:
 *   - renderToStaticMarkup for server-side render assertions
 *   - React 19's react-dom/client createRoot + flushSync for client-mount
 *     assertions against happy-dom's DOM.
 */

// Default mock: motion on (not reduced). Per-test overrides via vi.resetModules
// + vi.doMock + dynamic import, following the pattern used in DispatchGraph.test.tsx.
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: (): boolean => false,
}));

// Mock gsap so the component can be constructed in the test env without
// touching real animation machinery. We capture the `onComplete` we pass in
// so tests can observe timeline lifecycle without actual timers running.
vi.mock("@/lib/gsap-init", () => {
  type Timeline = {
    to: (..._args: unknown[]) => Timeline;
    set: (..._args: unknown[]) => Timeline;
    fromTo: (..._args: unknown[]) => Timeline;
    add: (..._args: unknown[]) => Timeline;
    kill: () => void;
  };
  function makeTimeline(): Timeline {
    const tl: Timeline = {
      to: () => tl,
      set: () => tl,
      fromTo: () => tl,
      add: () => tl,
      kill: () => undefined,
    };
    return tl;
  }
  return {
    gsap: {
      timeline: () => makeTimeline(),
      set: () => undefined,
      to: () => undefined,
      fromTo: () => undefined,
    },
  };
});

import { CinematicArrival } from "./CinematicArrival";

function render(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Already-played guard — the strict one-time rule                           */
/* ──────────────────────────────────────────────────────────────────────── */

describe("CinematicArrival — arrivalAlreadyPlayed=true", () => {
  it("returns null (empty string) when arrivalAlreadyPlayed is true", () => {
    const html = renderToStaticMarkup(
      <CinematicArrival
        arrivalAlreadyPlayed={true}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    expect(html).toBe("");
  });

  it("does not render a skip button when already-played", () => {
    const html = renderToStaticMarkup(
      <CinematicArrival
        arrivalAlreadyPlayed={true}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    expect(html).not.toMatch(/skip/i);
  });

  it("does not fire onComplete synchronously when already-played", () => {
    // If the component tried to fire onComplete on mount even though the
    // cinematic is already played, that would be a bug — the parent uses
    // onComplete to tear down the overlay; firing it when the overlay
    // isn't even mounted would cause a ghost teardown.
    const onComplete = vi.fn();
    renderToStaticMarkup(
      <CinematicArrival
        arrivalAlreadyPlayed={true}
        onComplete={onComplete}
        onSkip={() => undefined}
      />,
    );
    // SSR is synchronous — if the function had been called inline during
    // render (it shouldn't), we'd see it here.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does not fire onSkip when already-played", () => {
    const onSkip = vi.fn();
    renderToStaticMarkup(
      <CinematicArrival
        arrivalAlreadyPlayed={true}
        onComplete={() => undefined}
        onSkip={onSkip}
      />,
    );
    expect(onSkip).not.toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* First-visit render — cinematic is mounted, skip is wired                  */
/* ──────────────────────────────────────────────────────────────────────── */

describe("CinematicArrival — arrivalAlreadyPlayed=false (first visit)", () => {
  it("renders a non-empty overlay with cinematic scaffolding", () => {
    const html = renderToStaticMarkup(
      <CinematicArrival
        arrivalAlreadyPlayed={false}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders with the data-cinematic identifier so integration checks can find it", () => {
    const doc = render(
      <CinematicArrival
        arrivalAlreadyPlayed={false}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    expect(doc.querySelector('[data-cinematic="arrival"]')).not.toBeNull();
  });

  it("renders a Skip button with an accessible label", () => {
    const doc = render(
      <CinematicArrival
        arrivalAlreadyPlayed={false}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    const skip = doc.querySelector('button[data-action="skip-cinematic"]');
    expect(skip).not.toBeNull();
    // Accessible label — Otis-grade hospitality, not a raw "skip".
    const label = skip?.getAttribute("aria-label") ?? skip?.textContent ?? "";
    expect(label).toMatch(/skip/i);
  });

  it("advertises the cinematic to screen readers via role=dialog with an aria-label", () => {
    const doc = render(
      <CinematicArrival
        arrivalAlreadyPlayed={false}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    const dialog = doc.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-label")).toBeTruthy();
  });

  it("renders the first stage as the active data-stage on mount", () => {
    const doc = render(
      <CinematicArrival
        arrivalAlreadyPlayed={false}
        onComplete={() => undefined}
        onSkip={() => undefined}
      />,
    );
    const root = doc.querySelector('[data-cinematic="arrival"]');
    // First stage id from ArrivalStages is "approach".
    expect(root?.getAttribute("data-stage")).toBe("approach");
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Skip wiring — click Skip → onSkip fires (client-side)                     */
/* ──────────────────────────────────────────────────────────────────────── */

describe("CinematicArrival — skip button wiring", () => {
  it("fires onSkip when the skip button is clicked", async () => {
    // Client-mount path: happy-dom + react-dom/client createRoot.
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");

    const onSkip = vi.fn();
    const onComplete = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <CinematicArrival
          arrivalAlreadyPlayed={false}
          onComplete={onComplete}
          onSkip={onSkip}
        />,
      );
    });

    const skipBtn = host.querySelector(
      'button[data-action="skip-cinematic"]',
    ) as HTMLButtonElement | null;
    expect(skipBtn).not.toBeNull();

    await act(async () => {
      skipBtn?.click();
    });

    expect(onSkip).toHaveBeenCalledTimes(1);
    // onSkip is the parent's teardown trigger, not onComplete. onComplete
    // is reserved for the *natural* end of the cinematic.
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Reduced motion — completes immediately                                    */
/* ──────────────────────────────────────────────────────────────────────── */

describe("CinematicArrival — prefers-reduced-motion", () => {
  it("fires onComplete on mount (no animation) when reduced motion is on", async () => {
    vi.resetModules();
    vi.doMock("@/hooks/useReducedMotion", () => ({
      useReducedMotion: (): boolean => true,
    }));
    vi.doMock("@/lib/gsap-init", () => {
      const tl = {
        to: () => tl,
        set: () => tl,
        fromTo: () => tl,
        add: () => tl,
        kill: () => undefined,
      };
      return {
        gsap: {
          timeline: () => tl,
          set: () => undefined,
          to: () => undefined,
          fromTo: () => undefined,
        },
      };
    });

    const { CinematicArrival: RmCinematicArrival } = await import(
      "./CinematicArrival"
    );
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <RmCinematicArrival
          arrivalAlreadyPlayed={false}
          onComplete={onComplete}
          onSkip={onSkip}
        />,
      );
    });

    // Under reduced motion, the sequence collapses to a single 0-duration
    // stage and onComplete fires on mount — no frames, no waiting.
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
