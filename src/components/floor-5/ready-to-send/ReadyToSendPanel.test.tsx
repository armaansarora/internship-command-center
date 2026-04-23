// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadyToSendPanel, type ToneVariantCard } from "./ReadyToSendPanel";

/**
 * R5.6 — ReadyToSendPanel render assertions.
 *
 * Covers the UI half of the approval gate:
 *   - Approve button starts disabled + aria-disabled=true
 *   - Each tone card is a radio with aria-checked=false initially
 *   - PANEL never renders a "send without approval" shortcut
 *
 * Click-flow state transitions (select → enable approve) are covered by
 * the API route tests in ./__tests__/route.test.ts ; the non-negotiable
 * is enforced at BOTH layers (UI + API) so a single layer failing
 * doesn't compromise the gate.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const VARIANTS: ToneVariantCard[] = [
  {
    id: "doc-formal",
    tone: "formal",
    previewOpening: "Hexspire's institutional register is precisely the one I aim to operate within.",
    previewBody: "I offer two years of direct underwriting exposure at Blackstone Credit.",
  },
  {
    id: "doc-convo",
    tone: "conversational",
    previewOpening: "I've been reading CBRE's Q3 capital-markets notes.",
    previewBody: "I'm a junior at NYU Stern with 18 months in CRE analyst seats.",
  },
  {
    id: "doc-bold",
    tone: "bold",
    previewOpening: "Hire an intern who already shipped a working deal model.",
    previewBody: "Last summer I rebuilt a boutique's DCF template end-to-end.",
  },
];

function renderPanel(props: Partial<{ resumeTailoredId: string }> = {}): Document {
  const html = renderToStaticMarkup(
    <ReadyToSendPanel
      outreachQueueId="q-1"
      variants={VARIANTS}
      resumeTailoredId={props.resumeTailoredId}
      buildPdfUrl={
        props.resumeTailoredId
          ? (id: string) => `/api/documents/${id}/pdf`
          : undefined
      }
    />,
  );
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("ReadyToSendPanel — approval gate UI", () => {
  it("renders all three tone variant cards as radio buttons", () => {
    const doc = renderPanel();
    const radios = doc.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
    const tones = Array.from(radios).map((el) => el.getAttribute("data-tone"));
    expect(tones.sort()).toEqual(["bold", "conversational", "formal"]);
  });

  it("each tone card starts with aria-checked=false", () => {
    const doc = renderPanel();
    const radios = doc.querySelectorAll('[role="radio"]');
    radios.forEach((el) => {
      expect(el.getAttribute("aria-checked")).toBe("false");
    });
  });

  it("Approve button is disabled on first render (no tone chosen)", () => {
    const doc = renderPanel();
    const approve = doc.querySelector('[data-testid="approve-button"]');
    expect(approve).not.toBeNull();
    // Next.js/React strips the boolean `disabled` attribute to empty string.
    // Check that it is present (renders as "disabled" attribute) AND that
    // aria-disabled is true.
    expect(approve?.hasAttribute("disabled")).toBe(true);
    expect(approve?.getAttribute("aria-disabled")).toBe("true");
  });

  it("Approve button label reads APPROVE & SEND initially", () => {
    const doc = renderPanel();
    const approve = doc.querySelector('[data-testid="approve-button"]');
    expect(approve?.textContent?.trim()).toBe("APPROVE & SEND");
  });

  it("panel exposes its purpose via aria-label", () => {
    const doc = renderPanel();
    const region = doc.querySelector('[role="region"]');
    expect(region?.getAttribute("aria-label")).toMatch(/approval gate/i);
  });

  it("panel surfaces 'two clicks, on purpose' framing for the user", () => {
    const doc = renderPanel();
    const body = doc.body.textContent ?? "";
    expect(body).toMatch(/Pick one voice/i);
    expect(body).toMatch(/Then approve/i);
    expect(body).toMatch(/Two clicks, on purpose/i);
  });

  it("PDF preview link rendered only when resumeTailoredId is provided", () => {
    const withoutResume = renderPanel();
    expect(
      withoutResume.querySelector('a[aria-label="Review tailored resume PDF"]'),
    ).toBeNull();

    const withResume = renderPanel({ resumeTailoredId: "resume-1" });
    const link = withResume.querySelector(
      'a[aria-label="Review tailored resume PDF"]',
    );
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/api/documents/resume-1/pdf");
  });

  it("does NOT render any 'Generate & Send' or 'Send Now' shortcut button", () => {
    const doc = renderPanel();
    const buttons = doc.querySelectorAll("button");
    const texts = Array.from(buttons).map((b) => b.textContent?.toLowerCase() ?? "");
    // The only button that sends is the approve button, and it's disabled
    // by default. Under no circumstances should there be a "send now" bypass.
    expect(texts.some((t) => t.includes("send now"))).toBe(false);
    expect(texts.some((t) => t.includes("generate and send"))).toBe(false);
    expect(texts.some((t) => t.includes("quick send"))).toBe(false);
  });
});
