// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WallInscription } from "./WallInscription";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function render(): Document {
  const html = renderToStaticMarkup(<WallInscription />);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("WallInscription — sharpening detail", () => {
  it("renders a <figure> with accessible label", () => {
    const doc = render();
    const fig = doc.querySelector('figure[aria-label="Wall inscription — Writing Room"]');
    expect(fig).not.toBeNull();
  });

  it("contains the inscribed line wrapped in smart quotes", () => {
    const doc = render();
    const block = doc.querySelector("blockquote");
    expect(block).not.toBeNull();
    const text = block?.textContent ?? "";
    expect(text).toMatch(/Every draft is the only draft/);
    // Smart quotes, not ASCII double quote.
    expect(text).toMatch(/[“”]/);
  });

  it("has a visible figcaption with attribution framing", () => {
    const doc = render();
    const caption = doc.querySelector("figcaption");
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toMatch(/line someone wrote/i);
  });

  it("respects prefers-reduced-motion via @media CSS rule (no motion class gate)", () => {
    const doc = render();
    const html = doc.documentElement.outerHTML;
    // The style block references prefers-reduced-motion
    expect(html).toMatch(/prefers-reduced-motion: reduce/);
  });
});
