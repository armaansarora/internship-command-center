// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

import { TrustHeader } from "./TrustHeader";

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
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

describe("TrustHeader", () => {
  it("renders the canonical title and ethos line", () => {
    const m = mount(<TrustHeader />);
    cleanups.push(m.unmount);
    expect(m.host.textContent).toContain("Your Trust Console");
    expect(m.host.textContent).toContain(
      "What we know, what we use it for, how to take it back. All at the front.",
    );
  });

  it("links to the public privacy policy at /privacy", () => {
    const m = mount(<TrustHeader />);
    cleanups.push(m.unmount);
    const link = m.host.querySelector<HTMLAnchorElement>(
      "[data-testid='trust-header-privacy-link']",
    );
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/privacy");
  });

  it("uses a single h1 with an id that the section is labelled by", () => {
    const m = mount(<TrustHeader />);
    cleanups.push(m.unmount);
    const h1s = m.host.querySelectorAll("h1");
    expect(h1s.length).toBe(1);
    expect(h1s[0].id).toBe("trust-console-title");
    const header = m.host.querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.getAttribute("aria-labelledby")).toBe(
      "trust-console-title",
    );
  });
});
