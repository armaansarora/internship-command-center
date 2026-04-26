// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * OfferFolder render + interaction tests.
 *
 * Uses the project's manual createRoot + react act() pattern (no
 * @testing-library/react — see CLAUDE.md and ParlorDoor.test.tsx).
 *
 * Contracts under test:
 *   - Renders company name, role, location, formatted USD total, and status.
 *   - Total = base + bonus + equity + sign_on + housing.
 *   - Click fires `onSelect`.
 *   - `data-selected` mirrors the `selected` prop; so does `aria-pressed`.
 *   - Even-indexed folders tilt -1.5°, odd tilt +1.5° (stack-of-folders look).
 *   - Acts as `role="listitem"` inside the OakTable's `role="list"`.
 */

import { OfferFolder } from "./OfferFolder";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

function makeOffer(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: "offer-1",
    user_id: "u1",
    application_id: null,
    company_name: "Acme Corp",
    role: "Staff Engineer",
    level: null,
    location: "San Francisco, CA",
    base: 180000,
    bonus: 20000,
    equity: 50000,
    sign_on: 10000,
    housing: 0,
    start_date: null,
    benefits: {},
    received_at: "2026-04-20T10:00:00Z",
    deadline_at: null,
    status: "received",
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T10:00:00Z",
    ...overrides,
  };
}

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

function findButton(host: HTMLElement): HTMLButtonElement {
  const b = host.querySelector<HTMLButtonElement>("button.parlor-offer-folder");
  if (!b) throw new Error("OfferFolder button not found");
  return b;
}

let cleanups: Array<() => void> = [];
beforeEach(() => {
  cleanups = [];
});
afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("R10.6 OfferFolder — render contract", () => {
  it("renders company name, role, location, and status", () => {
    const offer = makeOffer({
      company_name: "Acme Corp",
      role: "Staff Engineer",
      location: "Seattle, WA",
      status: "negotiating",
    });
    const m = mount(
      <OfferFolder offer={offer} index={0} selected={false} onSelect={() => {}} />,
    );
    cleanups.push(m.unmount);
    const html = m.host.innerHTML;
    expect(html).toMatch(/Acme Corp/);
    expect(html).toMatch(/Staff Engineer/);
    expect(html).toMatch(/Seattle, WA/);
    expect(html).toMatch(/negotiating/);
  });

  it("renders total as formatted USD sum of base + bonus + equity + sign_on + housing", () => {
    const offer = makeOffer({
      base: 180000,
      bonus: 20000,
      equity: 50000,
      sign_on: 10000,
      housing: 5000,
    });
    const m = mount(
      <OfferFolder offer={offer} index={0} selected={false} onSelect={() => {}} />,
    );
    cleanups.push(m.unmount);
    // 180000 + 20000 + 50000 + 10000 + 5000 = 265000
    expect(m.host.innerHTML).toMatch(/\$265,000/);
  });

  it("acts as role=listitem so OakTable role=list is semantically complete", () => {
    const offer = makeOffer();
    const html = renderToStaticMarkup(
      <OfferFolder offer={offer} index={0} selected={false} onSelect={() => {}} />,
    );
    expect(html).toMatch(/role="listitem"/);
  });
});

describe("R10.6 OfferFolder — selection state", () => {
  it("sets data-selected=true when selected", () => {
    const offer = makeOffer();
    const m = mount(
      <OfferFolder offer={offer} index={0} selected onSelect={() => {}} />,
    );
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    expect(btn.getAttribute("data-selected")).toBe("true");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("sets data-selected=false when not selected", () => {
    const offer = makeOffer();
    const m = mount(
      <OfferFolder offer={offer} index={0} selected={false} onSelect={() => {}} />,
    );
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    expect(btn.getAttribute("data-selected")).toBe("false");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("R10.6 OfferFolder — tilt by index parity", () => {
  it("tilts -1.5deg for even index", () => {
    const offer = makeOffer();
    const m = mount(
      <OfferFolder offer={offer} index={0} selected={false} onSelect={() => {}} />,
    );
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    expect(btn.getAttribute("style")).toMatch(/rotate\(-1\.5deg\)/);
  });

  it("tilts +1.5deg for odd index", () => {
    const offer = makeOffer();
    const m = mount(
      <OfferFolder offer={offer} index={1} selected={false} onSelect={() => {}} />,
    );
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    expect(btn.getAttribute("style")).toMatch(/rotate\(1\.5deg\)/);
  });
});

describe("R10.6 OfferFolder — interaction", () => {
  it("calls onSelect when clicked", () => {
    const spy = vi.fn();
    const offer = makeOffer();
    const m = mount(
      <OfferFolder offer={offer} index={0} selected={false} onSelect={spy} />,
    );
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
