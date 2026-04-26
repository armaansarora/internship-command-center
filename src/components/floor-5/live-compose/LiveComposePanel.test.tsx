/**
 * LiveComposePanel render tests (SSR, matches R8 pattern).
 *
 * Three assertions:
 *   1. Renders three tone cards with aria-live="polite".
 *   2. Each card has a PenGlowCursor element by default.
 *   3. prefers-reduced-motion path omits the PenGlowCursor while keeping
 *      the streaming text surface intact.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveComposePanel } from "./LiveComposePanel";

describe("LiveComposePanel SSR", () => {
  it("renders three tone cards with aria-live", () => {
    const html = renderToStaticMarkup(
      <LiveComposePanel companyName="Acme" role="Analyst" />,
    );
    expect(html.match(/data-tone="formal"/g)?.length).toBe(1);
    expect(html.match(/data-tone="conversational"/g)?.length).toBe(1);
    expect(html.match(/data-tone="bold"/g)?.length).toBe(1);
    expect(html.match(/aria-live="polite"/g)?.length).toBe(3);
  });

  it("renders a pen-glow cursor per tone card by default", () => {
    const html = renderToStaticMarkup(
      <LiveComposePanel companyName="Acme" role="Analyst" />,
    );
    expect(html.match(/data-pen-glow="true"/g)?.length).toBe(3);
  });

  it("prefers-reduced-motion hides pen-glow cursors but keeps cards", () => {
    const html = renderToStaticMarkup(
      <LiveComposePanel companyName="Acme" role="Analyst" reducedMotion />,
    );
    expect(html.includes('data-pen-glow="true"')).toBe(false);
    expect(html.match(/aria-live="polite"/g)?.length).toBe(3);
  });
});
