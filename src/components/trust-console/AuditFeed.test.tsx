// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

import { AuditFeed, type AuditFeedEvent } from "./AuditFeed";

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

function ev(overrides: Partial<AuditFeedEvent> = {}): AuditFeedEvent {
  return {
    id: overrides.id ?? "ev-1",
    eventType: overrides.eventType ?? "networking_opted_in",
    resourceType: overrides.resourceType ?? null,
    resourceId: overrides.resourceId ?? null,
    metadata: overrides.metadata ?? {},
    createdAt: overrides.createdAt ?? "2026-05-10T10:00:00.000Z",
  };
}

let cleanups: Array<() => void> = [];
beforeEach(() => {
  cleanups = [];
});
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

describe("AuditFeed", () => {
  it("renders the empty state when no events are passed", () => {
    const m = mount(<AuditFeed events={[]} />);
    cleanups.push(m.unmount);
    const empty = m.host.querySelector("[data-testid='audit-feed-empty']");
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain(
      "Nothing here yet. Every consent change will land here.",
    );
  });

  it("maps known event types to human titles", () => {
    const events: AuditFeedEvent[] = [
      ev({ id: "e1", eventType: "networking_opted_in" }),
      ev({ id: "e2", eventType: "networking_revoked" }),
      ev({ id: "e3", eventType: "networking_revoke_cascade_failed" }),
      ev({ id: "e4", eventType: "consent_version_stale_denial" }),
      ev({
        id: "e5",
        eventType: "oauth_granted",
        resourceType: "gmail",
      }),
      ev({ id: "e6", eventType: "data_export_requested" }),
      ev({ id: "e7", eventType: "data_delete_requested" }),
    ];
    const m = mount(<AuditFeed events={events} />);
    cleanups.push(m.unmount);
    const text = m.host.textContent ?? "";
    expect(text).toContain("You opted in to warm-intro matching");
    expect(text).toContain("You revoked warm-intro matching");
    expect(text).toContain("Revocation incomplete — operator notified");
    expect(text).toContain("Action denied: consent version out of date");
    expect(text).toContain("OAuth grant: gmail");
    expect(text).toContain("Data export requested");
    expect(text).toContain("Account deletion requested");
  });

  it("renders unknown event types in monospace with the raw type", () => {
    const m = mount(
      <AuditFeed
        events={[
          ev({ id: "weird", eventType: "some_unknown_event_type" }),
        ]}
      />,
    );
    cleanups.push(m.unmount);
    const row = m.host.querySelector("[data-testid='audit-row']");
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain("some_unknown_event_type");
    // Title span uses JetBrains Mono.
    const titleSpan = row!.querySelector("span");
    expect(titleSpan!.getAttribute("style") ?? "").toContain(
      "JetBrains Mono",
    );
  });

  it("expands metadata as a JSON viewer when the row is opened", () => {
    const m = mount(
      <AuditFeed
        events={[
          ev({
            id: "with-meta",
            eventType: "networking_revoked",
            metadata: { reason: "user_initiated", cascade_count: 4 },
          }),
        ]}
      />,
    );
    cleanups.push(m.unmount);
    // Closed by default.
    expect(
      m.host.querySelector("[data-testid='audit-row-meta']"),
    ).toBeNull();
    const expand = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='audit-row-expand']",
    );
    expect(expand).not.toBeNull();
    expect(expand!.getAttribute("aria-expanded")).toBe("false");
    act(() => {
      expand!.click();
    });
    const meta = m.host.querySelector("[data-testid='audit-row-meta']");
    expect(meta).not.toBeNull();
    expect(meta!.textContent).toContain("user_initiated");
    expect(meta!.textContent).toContain("cascade_count");
    expect(meta!.textContent).toContain("4");
    expect(expand!.getAttribute("aria-expanded")).toBe("true");
  });

  it("hides the expand button when metadata is empty", () => {
    const m = mount(
      <AuditFeed events={[ev({ id: "no-meta", metadata: {} })]} />,
    );
    cleanups.push(m.unmount);
    expect(
      m.host.querySelector("[data-testid='audit-row-expand']"),
    ).toBeNull();
  });

  it("renders only `limit` rows initially and reveals more on Load more", () => {
    const events: AuditFeedEvent[] = Array.from(
      { length: 7 },
      (_, i) =>
        ev({
          id: `e-${i}`,
          eventType: "networking_opted_in",
          createdAt: new Date(2026, 4, 1 + i).toISOString(),
        }),
    );
    const m = mount(<AuditFeed events={events} limit={3} />);
    cleanups.push(m.unmount);
    let rows = m.host.querySelectorAll("[data-testid='audit-row']");
    expect(rows.length).toBe(3);
    const loadMore = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='audit-feed-load-more']",
    );
    expect(loadMore).not.toBeNull();
    act(() => {
      loadMore!.click();
    });
    rows = m.host.querySelectorAll("[data-testid='audit-row']");
    expect(rows.length).toBe(6);
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='audit-feed-load-more']",
        )!
        .click();
    });
    rows = m.host.querySelectorAll("[data-testid='audit-row']");
    expect(rows.length).toBe(7);
    // No more to load.
    expect(
      m.host.querySelector("[data-testid='audit-feed-load-more']"),
    ).toBeNull();
  });

  it("each row exposes a time element with an ISO dateTime attribute", () => {
    const m = mount(
      <AuditFeed
        events={[
          ev({
            id: "with-ts",
            createdAt: "2026-05-09T10:30:00.000Z",
          }),
        ]}
      />,
    );
    cleanups.push(m.unmount);
    const time = m.host.querySelector("time");
    expect(time).not.toBeNull();
    expect(time!.getAttribute("datetime")).toBe(
      "2026-05-09T10:30:00.000Z",
    );
  });
});
