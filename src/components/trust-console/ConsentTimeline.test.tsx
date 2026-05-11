// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

import {
  ConsentTimeline,
  type ConsentTimelineProps,
} from "./ConsentTimeline";

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

function makeProps(
  override: Partial<ConsentTimelineProps> = {},
): ConsentTimelineProps {
  return {
    networking: {
      state: "opted_in",
      sinceIso: "2026-05-01T12:00:00.000Z",
      consentVersion: 3,
    },
    gmail: {
      connected: true,
      sinceIso: "2026-04-15T09:00:00.000Z",
    },
    calendar: {
      connected: true,
      sinceIso: "2026-04-15T09:00:00.000Z",
    },
    ...override,
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

describe("ConsentTimeline", () => {
  it("renders three lanes labelled networking, gmail, calendar", () => {
    const m = mount(<ConsentTimeline {...makeProps()} />);
    cleanups.push(m.unmount);
    expect(
      m.host.querySelector("[data-testid='consent-lane-networking']"),
    ).not.toBeNull();
    expect(
      m.host.querySelector("[data-testid='consent-lane-gmail']"),
    ).not.toBeNull();
    expect(
      m.host.querySelector("[data-testid='consent-lane-calendar']"),
    ).not.toBeNull();
  });

  it("marks opted-in networking with the gold tone", () => {
    const m = mount(
      <ConsentTimeline
        {...makeProps({
          networking: {
            state: "opted_in",
            sinceIso: "2026-05-01T12:00:00Z",
            consentVersion: 3,
          },
        })}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector(
      "[data-testid='consent-badge-networking']",
    );
    expect(badge).not.toBeNull();
    expect(badge!.getAttribute("data-tone")).toBe("gold");
    expect(badge!.textContent).toContain("Opted in");
    expect(m.host.textContent).toContain("Consent v3");
  });

  it("marks revoked networking with the amber tone", () => {
    const m = mount(
      <ConsentTimeline
        {...makeProps({
          networking: {
            state: "revoked",
            sinceIso: "2026-05-09T08:00:00Z",
            consentVersion: 3,
          },
        })}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector(
      "[data-testid='consent-badge-networking']",
    );
    expect(badge!.getAttribute("data-tone")).toBe("amber");
    expect(badge!.textContent).toContain("Revoked");
    expect(m.host.textContent).toContain("Last accepted v3");
  });

  it("marks never-opted-in networking with the muted tone and no timestamp", () => {
    const m = mount(
      <ConsentTimeline
        {...makeProps({
          networking: {
            state: "never_opted_in",
            sinceIso: null,
            consentVersion: null,
          },
        })}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector(
      "[data-testid='consent-badge-networking']",
    );
    expect(badge!.getAttribute("data-tone")).toBe("muted");
    expect(badge!.textContent).toContain("Never opted in");
    const lane = m.host.querySelector(
      "[data-testid='consent-lane-networking']",
    );
    expect(lane!.textContent).toContain("—");
  });

  it("marks disconnected gmail as amber when there is a prior sinceIso", () => {
    const m = mount(
      <ConsentTimeline
        {...makeProps({
          gmail: {
            connected: false,
            sinceIso: "2026-04-01T09:00:00Z",
          },
        })}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector(
      "[data-testid='consent-badge-gmail']",
    );
    expect(badge!.getAttribute("data-tone")).toBe("amber");
    expect(badge!.textContent).toContain("Disconnected");
  });

  it("marks never-connected gmail as muted when sinceIso is null", () => {
    const m = mount(
      <ConsentTimeline
        {...makeProps({
          gmail: { connected: false, sinceIso: null },
        })}
      />,
    );
    cleanups.push(m.unmount);
    const badge = m.host.querySelector(
      "[data-testid='consent-badge-gmail']",
    );
    expect(badge!.getAttribute("data-tone")).toBe("muted");
  });

  it("marks connected calendar with the gold tone", () => {
    const m = mount(<ConsentTimeline {...makeProps()} />);
    cleanups.push(m.unmount);
    const badge = m.host.querySelector(
      "[data-testid='consent-badge-calendar']",
    );
    expect(badge!.getAttribute("data-tone")).toBe("gold");
    expect(badge!.textContent).toContain("Connected");
  });

  it("renders an aria-labelledby section with a Playfair Display title", () => {
    const m = mount(<ConsentTimeline {...makeProps()} />);
    cleanups.push(m.unmount);
    const section = m.host.querySelector("section");
    expect(section!.getAttribute("aria-labelledby")).toBe(
      "consent-timeline-title",
    );
    const title = m.host.querySelector("#consent-timeline-title");
    expect(title).not.toBeNull();
  });
});
