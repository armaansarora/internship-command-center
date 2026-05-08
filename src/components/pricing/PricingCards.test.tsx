// @vitest-environment happy-dom

import { act } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STRIPE_PLANS } from "@/lib/stripe/config";
import { PricingCards } from "./PricingCards";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: ReactElement): Mounted {
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(handler);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function findButton(host: HTMLElement, name: RegExp): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) =>
      name.test(candidate.textContent ?? "") ||
      name.test(candidate.getAttribute("aria-label") ?? ""),
  );
  if (!button) {
    throw new Error(`No button matched ${name}`);
  }
  return button;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.click();
    await flushPromises();
  });
}

let cleanups: Array<() => void> = [];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  cleanups = [];
  window.history.pushState(null, "", "/settings");
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  document.body.innerHTML = "";
  window.history.pushState(null, "", "/settings");
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("PricingCards billing actions", () => {
  it("sends free users to Checkout for paid upgrades", () => {
    const html = renderToStaticMarkup(
      <PricingCards currentTier="free" appsUsed={3} />,
    );

    expect(html).toContain("Current Plan");
    expect(html).toContain("Upgrade to Pro");
    expect(html).toContain("Upgrade to Team");
  });

  it("sends paid users to the billing portal for every plan change", () => {
    const html = renderToStaticMarkup(
      <PricingCards currentTier="pro" appsUsed={14} onManageBilling={() => {}} />,
    );

    expect(html).toContain("Current Plan");
    expect(html).toContain("Manage Billing");
    expect(html).not.toContain("Downgrade");
    expect(html).not.toContain("Upgrade to Team");
  });

  it("posts free-user upgrades to Stripe Checkout and redirects to the session", async () => {
    const checkoutUrl = "https://checkout.stripe.com/c/session_123";
    const fetchMock = installFetch(async () => jsonResponse({ url: checkoutUrl }));
    const mounted = mount(<PricingCards currentTier="free" appsUsed={3} />);
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /Upgrade to Pro/i));

    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: STRIPE_PLANS.pro.priceId }),
    });
    expect(window.location.href).toBe(checkoutUrl);
  });

  it("shows a billing-desk error when Stripe Checkout creation fails", async () => {
    installFetch(async () => jsonResponse({ error: "unavailable" }, 503));
    const mounted = mount(<PricingCards currentTier="free" appsUsed={3} />);
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /Upgrade to Pro/i));

    expect(mounted.host.querySelector('[role="alert"]')?.textContent).toContain(
      "The billing desk did not answer. Try again in a moment.",
    );
  });

  it("routes paid-user plan changes through the billing portal callback", async () => {
    const onManageBilling = vi.fn();
    const mounted = mount(
      <PricingCards
        currentTier="pro"
        appsUsed={14}
        onManageBilling={onManageBilling}
      />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /Manage Team plan in billing portal/i));

    expect(onManageBilling).toHaveBeenCalledTimes(1);
  });
});
