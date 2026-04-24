// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R10.9 — NegotiationDraftPanel render + reveal tests.
 *
 * Uses the project's manual createRoot + react act() pattern (no
 * @testing-library/react — see OfferFolder.test.tsx + ParlorDoor.test.tsx).
 *
 * Contracts under test:
 *   - Initial render: "Draft negotiation" button present; no fetch fired.
 *   - Clicking the button POSTs to `/api/offers/:id/negotiation-draft` and
 *     reveals subject + body into the DOM.
 *   - `reducedMotion={true}` snaps the body in full on arrival; no cursor.
 *   - Reveal completes → `onDrafted(outreachId)` fires exactly once.
 */

import { NegotiationDraftPanel } from "./NegotiationDraftPanel";

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: React.ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function findCta(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(
    "[data-testid='negotiation-draft-cta']",
  );
}

async function flushMicrotasks(): Promise<void> {
  // Allow the fetch().then chain to drain.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
  // Default to reduced-motion fetch response that snaps in place so tests
  // don't need to drive rAF unless they explicitly opt in.
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({
        outreach: {
          id: "ot-1",
          subject: "RE: Acme offer",
          body: "Hi Jane, I'd love to discuss the offer you extended.",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.unstubAllGlobals();
});

describe("NegotiationDraftPanel — initial render", () => {
  it("shows the Draft negotiation CTA and fires NO network call on mount", () => {
    const m = mount(
      <NegotiationDraftPanel offerId="offer-1" reducedMotion />,
    );
    cleanups.push(m.unmount);
    const btn = findCta(m.host);
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toMatch(/draft negotiation/i);
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
  });

  it("renders region with accessible label", () => {
    const m = mount(
      <NegotiationDraftPanel offerId="offer-1" reducedMotion />,
    );
    cleanups.push(m.unmount);
    const region = m.host.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-label")).toMatch(/negotiation draft/i);
  });
});

describe("NegotiationDraftPanel — click → fetch → reveal", () => {
  it("POSTs to the per-offer endpoint with convening in the body", async () => {
    const m = mount(
      <NegotiationDraftPanel
        offerId="offer-99"
        convening={null}
        reducedMotion
      />,
    );
    cleanups.push(m.unmount);

    const btn = findCta(m.host);
    if (!btn) throw new Error("CTA not found");
    await act(async () => {
      btn.click();
    });
    await flushMicrotasks();

    const fetchMock = globalThis.fetch as unknown as {
      mock: { calls: unknown[][] };
    };
    expect(fetchMock.mock.calls.length).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/offers/offer-99/negotiation-draft");
    expect(init.method).toBe("POST");
    const parsed = JSON.parse((init.body as string) ?? "{}") as {
      convening: unknown;
    };
    expect(parsed.convening).toBeNull();
  });

  it("reveals subject + body after fetch resolves (reducedMotion branch)", async () => {
    const onDrafted = vi.fn();
    const m = mount(
      <NegotiationDraftPanel
        offerId="offer-1"
        reducedMotion
        onDrafted={onDrafted}
      />,
    );
    cleanups.push(m.unmount);

    const btn = findCta(m.host);
    if (!btn) throw new Error("CTA not found");
    await act(async () => {
      btn.click();
    });
    await flushMicrotasks();

    const html = m.host.innerHTML;
    expect(html).toMatch(/RE: Acme offer/);
    expect(html).toMatch(/I'd love to discuss the offer/);
    // CTA should be gone once the draft resolves.
    expect(findCta(m.host)).toBeNull();
    // Done callback fires exactly once.
    expect(onDrafted).toHaveBeenCalledTimes(1);
    expect(onDrafted).toHaveBeenCalledWith("ot-1");
  });
});

describe("NegotiationDraftPanel — reducedMotion snaps the body in place", () => {
  it("renders the full body immediately when reducedMotion=true (no cursor)", async () => {
    const m = mount(
      <NegotiationDraftPanel offerId="offer-1" reducedMotion />,
    );
    cleanups.push(m.unmount);

    const btn = findCta(m.host);
    if (!btn) throw new Error("CTA not found");
    await act(async () => {
      btn.click();
    });
    await flushMicrotasks();

    const text = m.host.querySelector(".parlor-negotiation-draft-text");
    expect(text).not.toBeNull();
    // Full text revealed on first paint.
    expect(text?.textContent ?? "").toMatch(
      /I'd love to discuss the offer you extended\.$/,
    );
    // No pen-glow cursor element under reduced motion.
    expect(m.host.querySelector("[data-pen-glow='true']")).toBeNull();
  });

  it("data-state transitions to 'done' after the reveal (reducedMotion)", async () => {
    const m = mount(
      <NegotiationDraftPanel offerId="offer-1" reducedMotion />,
    );
    cleanups.push(m.unmount);
    const btn = findCta(m.host);
    if (!btn) throw new Error("CTA not found");
    await act(async () => {
      btn.click();
    });
    await flushMicrotasks();
    const region = m.host.querySelector<HTMLElement>('[role="region"]');
    expect(region?.getAttribute("data-state")).toBe("done");
  });
});

describe("NegotiationDraftPanel — onDrafted fires once", () => {
  it("does not refire onDrafted on re-render", async () => {
    const onDrafted = vi.fn();
    const m = mount(
      <NegotiationDraftPanel
        offerId="offer-1"
        reducedMotion
        onDrafted={onDrafted}
      />,
    );
    cleanups.push(m.unmount);
    const btn = findCta(m.host);
    if (!btn) throw new Error("CTA not found");
    await act(async () => {
      btn.click();
    });
    await flushMicrotasks();

    expect(onDrafted).toHaveBeenCalledTimes(1);

    // Force a re-render by updating a prop — callback should NOT refire.
    act(() => {
      m.root.render(
        <NegotiationDraftPanel
          offerId="offer-1"
          reducedMotion
          onDrafted={onDrafted}
          convening={null}
        />,
      );
    });
    await flushMicrotasks();
    expect(onDrafted).toHaveBeenCalledTimes(1);
  });
});
