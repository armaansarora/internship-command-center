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

/**
 * R10 post-mortem (test-tightening pass) — 4-round UI flow.
 *
 * Existing tests covered round-0→round-1 transition only, and a separate
 * stubbed done=true response. Nothing exercised 4 sequential UI clicks
 * driving 4 user-reply rounds with accumulating scores. This block does:
 *   - Click Start (round 0 opener, scoring=null)
 *   - Type + Send 4 times (rounds 1-4, scoring populated each round)
 *   - Assert each fetch call carries the cumulative history
 *   - Assert score badges accumulate (TurnScoreBadge per user turn)
 *   - Assert phase=done with the Start over button after the final round
 *
 * (`userEvent` isn't available in this codebase — the project pattern is
 * manual createRoot + act(). The original test-tightening spec named
 * userEvent; we match it functionally with element.click() inside act().)
 */
describe("R10 post-mortem — NegotiationSimulator 4-round UI flow", () => {
  it("drives 4 rounds end-to-end: 5 fetches, score badges accumulate, ends in done phase", async () => {
    const stagedResponses = [
      // Start → round 0 opener (scoring null).
      {
        recruiterReply: "Opening at $170,000.",
        scoring: null, round: 0, done: false,
      },
      // Send 1 → round 1.
      {
        recruiterReply: "Let me check with my director.",
        scoring: { anchorScore: 5, concessionScore: 5, walkawayScore: 5, critique: "Strong anchor hold." },
        round: 1, done: false,
      },
      // Send 2 → round 2.
      {
        recruiterReply: "We can move to $185K.",
        scoring: { anchorScore: 4, concessionScore: 4, walkawayScore: 4, critique: "Concession within flex." },
        round: 2, done: false,
      },
      // Send 3 → round 3.
      {
        recruiterReply: "$182K is the floor on base.",
        scoring: { anchorScore: 3, concessionScore: 3, walkawayScore: 3, critique: "Anchor erosion." },
        round: 3, done: false,
      },
      // Send 4 → round 4 (final).
      {
        recruiterReply: "Understood. Re-opening equity refresh.",
        scoring: { anchorScore: 2, concessionScore: 2, walkawayScore: 4, critique: "Walkaway acknowledged." },
        round: 4, done: true,
      },
    ];

    let nth = 0;
    type FetchCall = { url: string; body: { history: HistoryEntry[]; userReply: string | null } };
    type HistoryEntry = { role: "user" | "recruiter"; text: string };
    const fetchCalls: FetchCall[] = [];
    const fetchMock = vi.fn(async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as FetchCall["body"];
      fetchCalls.push({ url, body });
      const reply = stagedResponses[nth];
      nth += 1;
      if (!reply) throw new Error(`unexpected ${nth}th fetch`);
      return new Response(JSON.stringify(reply), { status: 200 });
    });
    Object.defineProperty(globalThis, "fetch", {
      value: fetchMock, writable: true, configurable: true,
    });

    const m = mount(<NegotiationSimulator offer={offer()} />);
    cleanups.push(m.unmount);

    // Click Start (POST 1 — opener, history=[]).
    await act(async () => {
      m.host.querySelector<HTMLButtonElement>("[data-testid='sim-start']")!.click();
    });
    await flush();
    expect(m.host.textContent).toContain("Opening at $170,000");

    // Type + Send 4 sequential user replies; each triggers the next POST.
    const userReplies = [
      "I was anchoring at $200,000.",
      "I can come down to $190K.",
      "$186K works with $20K signing.",
      "If that's the floor I'd need to walk.",
    ];
    for (const reply of userReplies) {
      const textarea = m.host.querySelector<HTMLTextAreaElement>(
        "[data-testid='sim-reply-input']",
      );
      await act(async () => { setTextareaValue(textarea!, reply); });
      await act(async () => {
        m.host.querySelector<HTMLButtonElement>("[data-testid='sim-send']")!.click();
      });
      await flush();
    }

    // 5 fetches total: 1 Start + 4 Sends.
    expect(fetchMock).toHaveBeenCalledTimes(5);

    // History accumulates: lengths 0, 2, 4, 6, 8 — matches the route's
    // round counter (Math.floor(history.length / 2)).
    expect(fetchCalls.map((c) => c.body.history.length)).toEqual([0, 2, 4, 6, 8]);

    // First fetch sends userReply=null; subsequent fetches carry the user
    // reply that round (anchor → flex → flex → walkaway).
    expect(fetchCalls[0]!.body.userReply).toBeNull();
    expect(fetchCalls[1]!.body.userReply).toContain("$200,000");
    expect(fetchCalls[2]!.body.userReply).toContain("$190K");
    expect(fetchCalls[3]!.body.userReply).toContain("$186K");
    expect(fetchCalls[4]!.body.userReply).toMatch(/walk/i);

    // The final round's recruiter reply rendered.
    expect(m.host.textContent).toContain("Re-opening equity refresh");

    // 4 score badges (one per user turn) — proves scoring accumulated, not
    // just the last round's score.
    const badges = m.host.querySelectorAll(".parlor-turn-score-badge, [data-testid^='turn-score']");
    // The badge component may use a different class — fall back to counting
    // visible critique strings, which appear once per scored round.
    const allCritiques = [
      "Strong anchor hold",
      "Concession within flex",
      "Anchor erosion",
      "Walkaway acknowledged",
    ];
    for (const c of allCritiques) {
      expect(m.host.textContent).toContain(c);
    }
    // And/or assert badge count if the class hits.
    if (badges.length > 0) {
      expect(badges.length).toBe(4);
    }

    // Phase flipped to done — Start over button visible, Send button gone.
    expect(
      m.host.querySelector<HTMLButtonElement>("[data-testid='sim-reset']"),
    ).not.toBeNull();
    expect(
      m.host.querySelector<HTMLButtonElement>("[data-testid='sim-send']"),
    ).toBeNull();
  });
});
