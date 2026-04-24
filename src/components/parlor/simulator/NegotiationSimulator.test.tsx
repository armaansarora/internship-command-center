// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { NegotiationSimulator } from "./NegotiationSimulator";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

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

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  });
}

/**
 * React 19 + happy-dom: setting `.value` directly bypasses React's onChange
 * because React tracks the previous value via a hidden internal setter.
 * Pattern mirrors RejectionReflectionStrip.test.tsx.
 */
function setTextareaValue(ta: HTMLTextAreaElement, value: string): void {
  const proto = Object.getPrototypeOf(ta) as HTMLTextAreaElement;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  desc?.set?.call(ta, value);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}

function offer(): OfferRow {
  return {
    id: "o1", user_id: "u1", application_id: null,
    company_name: "Acme", role: "Analyst", level: null, location: "NYC",
    base: 180000, bonus: 0, equity: 0, sign_on: 0, housing: 0,
    start_date: null, benefits: {},
    received_at: "2026-04-23T00:00:00.000Z", deadline_at: null,
    status: "received",
    created_at: "2026-04-23T00:00:00.000Z", updated_at: "2026-04-23T00:00:00.000Z",
  };
}

let cleanups: Array<() => void> = [];
beforeEach(() => {
  cleanups = [];
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({
        recruiterReply: "We can offer $170,000 base.",
        scoring: null, round: 0, done: false,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
  Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true, configurable: true });
  cleanups.push(() => { delete (globalThis as Record<string, unknown>).fetch; });
});
afterEach(() => { cleanups.forEach((fn) => fn()); cleanups = []; });

describe("R10.13 NegotiationSimulator", () => {
  it("renders stance form with anchor/flex/walkaway inputs prefilled from offer.base", () => {
    const m = mount(<NegotiationSimulator offer={offer()} />);
    cleanups.push(m.unmount);
    const anchor = m.host.querySelector<HTMLInputElement>("input[name='anchor']");
    const flex = m.host.querySelector<HTMLInputElement>("input[name='flex']");
    const walkaway = m.host.querySelector<HTMLInputElement>("input[name='walkaway']");
    expect(Number(anchor!.value)).toBe(180000);
    expect(Number(flex!.value)).toBe(9000);
    expect(Number(walkaway!.value)).toBe(162000);
  });

  it("clicking Start simulation fires POST and renders recruiter reply", async () => {
    const m = mount(<NegotiationSimulator offer={offer()} />);
    cleanups.push(m.unmount);
    const startBtn = m.host.querySelector<HTMLButtonElement>("[data-testid='sim-start']");
    await act(async () => { startBtn!.click(); });
    await flush();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/offers/o1/simulate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(m.host.textContent).toContain("$170,000");
  });

  it("after round 0, user can submit a reply and next fetch scores it", async () => {
    let nth = 0;
    const fetchMock = vi.fn(async () => {
      nth += 1;
      if (nth === 1) {
        return new Response(
          JSON.stringify({ recruiterReply: "Opening at $170,000.", scoring: null, round: 0, done: false }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          recruiterReply: "I hear you. Let me check with my director.",
          scoring: { anchorScore: 4, concessionScore: 3, walkawayScore: 0, critique: "Good anchor hold." },
          round: 1, done: false,
        }),
        { status: 200 },
      );
    });
    Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true, configurable: true });
    const m = mount(<NegotiationSimulator offer={offer()} />);
    cleanups.push(m.unmount);
    const startBtn = m.host.querySelector<HTMLButtonElement>("[data-testid='sim-start']");
    await act(async () => { startBtn!.click(); });
    await flush();
    const textarea = m.host.querySelector<HTMLTextAreaElement>("[data-testid='sim-reply-input']");
    await act(async () => {
      setTextareaValue(textarea!, "I was targeting $185,000 given market data.");
    });
    const sendBtn = m.host.querySelector<HTMLButtonElement>("[data-testid='sim-send']");
    await act(async () => { sendBtn!.click(); });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(m.host.textContent).toContain("Good anchor hold");
    expect(m.host.textContent).toContain("check with my director");
  });

  it("done=true response shows Start over button", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          recruiterReply: "Final word.",
          scoring: { anchorScore: 5, concessionScore: 5, walkawayScore: 5, critique: "Clean close." },
          round: 4, done: true,
        }),
        { status: 200 },
      ),
    );
    Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true, configurable: true });
    const m = mount(<NegotiationSimulator offer={offer()} />);
    cleanups.push(m.unmount);
    const startBtn = m.host.querySelector<HTMLButtonElement>("[data-testid='sim-start']");
    await act(async () => { startBtn!.click(); });
    await flush();
    const resetBtn = m.host.querySelector<HTMLButtonElement>("[data-testid='sim-reset']");
    expect(resetBtn).not.toBeNull();
  });
});
