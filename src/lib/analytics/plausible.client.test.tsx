/**
 * PlausibleScript render gate tests.
 *
 * Three flag states matter:
 *   1. NEXT_PUBLIC_PLAUSIBLE_DOMAIN set + flag on → script renders with
 *      tagged-events src + correct data-domain.
 *   2. NEXT_PUBLIC_PLAUSIBLE_DOMAIN unset → flag returns false → null SSR.
 *   3. NEXT_PUBLIC_PLAUSIBLE_SRC env var override is honored when present.
 *
 * `next/script` is mocked to a passthrough <script> tag so renderToStaticMarkup
 * can serialise the output without booting the Next.js runtime.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// `next/script` requires the Next.js runtime to register the script with the
// app loader. We mirror it onto a vanilla <script> tag — the test only cares
// that the element renders with the right `src` and `data-domain`, not that
// Next's script loader bookkeeping fires.
vi.mock("next/script", () => ({
  default: (props: Record<string, unknown>) => {
    // Drop the `strategy` prop — it is Next-specific and renders into the
    // DOM as a literal attribute that would just clutter the assertion.
    const { strategy: _strategy, ...rest } = props as {
      strategy?: string;
      [key: string]: unknown;
    };
    return <script {...(rest as Record<string, string>)} />;
  },
}));

import { PlausibleScript } from "./plausible.client";

describe("PlausibleScript", () => {
  const originalDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const originalSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;
  });

  afterEach(() => {
    if (originalDomain === undefined) {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalDomain;
    }
    if (originalSrc === undefined) {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;
    } else {
      process.env.NEXT_PUBLIC_PLAUSIBLE_SRC = originalSrc;
    }
  });

  it("renders ONLY when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "interntower.com";

    const html = renderToStaticMarkup(<PlausibleScript />);

    expect(html).toContain("<script");
    expect(html).toContain('data-domain="interntower.com"');
  });

  it("renders the tagged-events.js src by default (enables CSS-class goals)", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "interntower.com";

    const html = renderToStaticMarkup(<PlausibleScript />);

    expect(html).toContain("plausible.io/js/script.tagged-events.js");
  });

  it("honors NEXT_PUBLIC_PLAUSIBLE_SRC override when present (self-hosted proxy)", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "interntower.com";
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC =
      "https://interntower.com/js/proxied-script.js";

    const html = renderToStaticMarkup(<PlausibleScript />);

    expect(html).toContain(
      'src="https://interntower.com/js/proxied-script.js"',
    );
    expect(html).not.toContain("plausible.io/js/script.tagged-events.js");
  });

  it("renders NOTHING when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset (flag off)", () => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    const html = renderToStaticMarkup(<PlausibleScript />);

    // The component must return null — no markup, no Plausible reference at all.
    expect(html).toBe("");
  });

  it("renders nothing when domain is the empty string (treated as unset)", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "";

    const html = renderToStaticMarkup(<PlausibleScript />);

    expect(html).toBe("");
  });
});
