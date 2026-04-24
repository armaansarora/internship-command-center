// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R11.9 — NetworkingAudit render contract.
 *
 * Manual createRoot + react act() pattern (no @testing-library/react in
 * this repo — see parlor/OfferFolder.test.tsx, floor-2/orrery/Orrery.test.tsx).
 *
 * Contracts under test:
 *   - Empty events renders the empty-state copy.
 *   - Each event renders a human-readable one-liner that names the company.
 *   - The counterparty HMAC key (match_reason in worst case) never leaks to
 *     visible copy — anon keys stay in a visually-hidden span.
 *   - Section has aria-labelledby="section-networking-audit" wired to the
 *     matching h3 id (accessibility guard).
 */

import { NetworkingAudit, type MatchEvent } from "../NetworkingAudit";

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

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
});

afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("NetworkingAudit", () => {
  it("renders empty state when events is []", () => {
    const m = mount(<NetworkingAudit events={[]} />);
    cleanups.push(m.unmount);
    expect(m.host.textContent ?? "").toMatch(/No matches yet/i);
  });

  it("renders a one-liner per event, naming the company", () => {
    const events: MatchEvent[] = [
      {
        id: "1",
        companyContext: "Acme",
        firedAt: "2026-04-24T12:00:00Z",
        edgeStrength: "1.000",
        matchReason: "warm contact at Acme",
      },
      {
        id: "2",
        companyContext: "Globex",
        firedAt: "2026-04-23T10:00:00Z",
        edgeStrength: "0.500",
        matchReason: "warm contact at Globex",
      },
    ];
    const m = mount(<NetworkingAudit events={events} />);
    cleanups.push(m.unmount);
    const text = m.host.textContent ?? "";
    expect(text).toMatch(/matched with a contact at Acme/i);
    expect(text).toMatch(/matched with a contact at Globex/i);
  });

  it("never displays counterparty anon keys in the user-visible copy", () => {
    const events: MatchEvent[] = [
      {
        id: "1",
        companyContext: "Acme",
        firedAt: "2026-04-24T12:00:00Z",
        edgeStrength: "1.000",
        matchReason: "abc123def456",
      },
    ];
    const m = mount(<NetworkingAudit events={events} />);
    cleanups.push(m.unmount);

    // The visible (non-sr-only) span must not contain the opaque match_reason.
    const visibleSpans = Array.from(
      m.host.querySelectorAll<HTMLSpanElement>("li > span:not(.sr-only)"),
    );
    expect(visibleSpans.length).toBeGreaterThan(0);
    for (const s of visibleSpans) {
      expect(s.textContent ?? "").not.toContain("abc123def456");
    }
  });

  it("has aria-labelledby wired to the section h3", () => {
    const m = mount(<NetworkingAudit events={[]} />);
    cleanups.push(m.unmount);
    const section = m.host.querySelector(
      "section[aria-labelledby='section-networking-audit']",
    );
    expect(section).not.toBeNull();
    const heading = m.host.querySelector("#section-networking-audit");
    expect(heading).not.toBeNull();
  });
});
