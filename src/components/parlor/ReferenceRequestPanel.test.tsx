// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { ReferenceRequestPanel } from "./ReferenceRequestPanel";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";

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

function contact(overrides: Partial<ContactForAgent> = {}): ContactForAgent {
  return {
    id: "c1",
    name: "Sarah Chen",
    email: null,
    title: "Senior PM",
    companyId: null,
    companyName: "Globex",
    relationship: null,
    linkedinUrl: null,
    phone: null,
    introducedBy: null,
    notes: null,
    privateNote: null,
    source: null,
    lastContactAt: null,
    warmthLevel: "warm",
    warmthScore: 92,
    daysSinceContact: 4,
    ...overrides,
  };
}

let cleanups: Array<() => void> = [];
beforeEach(() => { cleanups = []; });
afterEach(() => { cleanups.forEach((fn) => fn()); cleanups = []; });

describe("R10.14 ReferenceRequestPanel", () => {
  it("renders up to 3 warm contact cards when warm is non-empty", () => {
    const warms = [
      contact({ id: "c1", name: "Sarah" }),
      contact({ id: "c2", name: "Julia" }),
      contact({ id: "c3", name: "Michael" }),
    ];
    const m = mount(
      <ReferenceRequestPanel
        topWarmContacts={warms}
        fallbackCoolingContacts={[]}
        selectedOfferId="o1"
      />,
    );
    cleanups.push(m.unmount);
    const cards = m.host.querySelectorAll("[data-testid='ref-contact-card']");
    expect(cards.length).toBe(3);
    expect(m.host.textContent).toContain("Sarah");
    expect(m.host.textContent).toContain("Julia");
    expect(m.host.textContent).toContain("Michael");
  });

  it("shows cooling fallback + re-warm coaching when warm is empty", () => {
    const coolings = [contact({ id: "cc1", name: "Alex", warmthLevel: "cooling" })];
    const m = mount(
      <ReferenceRequestPanel
        topWarmContacts={[]}
        fallbackCoolingContacts={coolings}
        selectedOfferId="o1"
      />,
    );
    cleanups.push(m.unmount);
    expect(m.host.textContent).toContain("re-warm");
    expect(m.host.textContent).toContain("Alex");
    const draftBtns = m.host.querySelectorAll("[data-testid='ref-draft-cta']");
    expect(draftBtns.length).toBe(0);
  });

  it("shows Floor 6 signpost when both warm and cooling are empty", () => {
    const m = mount(
      <ReferenceRequestPanel
        topWarmContacts={[]}
        fallbackCoolingContacts={[]}
        selectedOfferId="o1"
      />,
    );
    cleanups.push(m.unmount);
    expect(m.host.textContent).toContain("Rolodex Lounge");
    const link = m.host.querySelector<HTMLAnchorElement>("a[href='/rolodex-lounge']");
    expect(link).not.toBeNull();
  });

  it("clicking Draft reference posts to the endpoint and shows the draft", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          outreach: {
            id: "ot-ref-1",
            subject: "Quick ask — Acme reference",
            body: "Hi Sarah, I'd love to list you as a reference for Acme Analyst role. — Armaan",
            type: "reference_request",
            status: "pending_approval",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    Object.defineProperty(globalThis, "fetch", {
      value: fetchMock, writable: true, configurable: true,
    });
    cleanups.push(() => { delete (globalThis as Record<string, unknown>).fetch; });

    const m = mount(
      <ReferenceRequestPanel
        topWarmContacts={[contact({ id: "c1", name: "Sarah" })]}
        fallbackCoolingContacts={[]}
        selectedOfferId="o1"
        reducedMotion={true}
      />,
    );
    cleanups.push(m.unmount);

    const draftBtn = m.host.querySelector<HTMLButtonElement>("[data-testid='ref-draft-cta']");
    await act(async () => { draftBtn!.click(); });
    await flush();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/contacts/c1/reference-request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ offerId: "o1" }),
      }),
    );
    expect(m.host.textContent).toContain("Quick ask");
    expect(m.host.textContent).toContain("Hi Sarah");
  });
});
