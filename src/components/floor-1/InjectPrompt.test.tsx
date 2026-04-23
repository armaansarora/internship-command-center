// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { InjectPrompt, parseInjectKey } from "./InjectPrompt";

/**
 * R3.11 — unit tests for the floating `/`-inject prompt.
 *
 * Approach mirrors the rest of the R3 suite: the pure decision helper
 * (`parseInjectKey`) carries all of the branching logic, so we exercise it
 * exhaustively in isolation and then do a small SSR spot-check to confirm
 * that the React component renders the right aria scaffolding when open
 * and renders nothing when closed.
 *
 * We don't drive keyboard events through happy-dom because @testing-library
 * isn't available in this project — the helper + SSR split keeps the test
 * deterministic and fast.
 */

/* ────────────────────────────────────────────────────────────────────────── */
/* parseInjectKey                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

describe("parseInjectKey", () => {
  it("returns null for an unrelated key (letter)", () => {
    expect(parseInjectKey("a", "hello")).toBeNull();
  });

  it("returns null for an unrelated key (Tab)", () => {
    expect(parseInjectKey("Tab", "hello")).toBeNull();
  });

  it("returns null for an unrelated key (Shift)", () => {
    expect(parseInjectKey("Shift", "hello")).toBeNull();
  });

  it("returns { action: 'close' } for Escape regardless of value", () => {
    expect(parseInjectKey("Escape", "")).toEqual({ action: "close" });
    expect(parseInjectKey("Escape", "   ")).toEqual({ action: "close" });
    expect(parseInjectKey("Escape", "some text")).toEqual({ action: "close" });
  });

  it("returns null for Enter when value is empty", () => {
    expect(parseInjectKey("Enter", "")).toBeNull();
  });

  it("returns null for Enter when value is only whitespace", () => {
    expect(parseInjectKey("Enter", "   ")).toBeNull();
    expect(parseInjectKey("Enter", "\t\n  \r")).toBeNull();
  });

  it("returns { action: 'submit', text } with trimmed text on Enter", () => {
    expect(parseInjectKey("Enter", "go faster")).toEqual({
      action: "submit",
      text: "go faster",
    });
    expect(parseInjectKey("Enter", "  focus on CRO  ")).toEqual({
      action: "submit",
      text: "focus on CRO",
    });
    expect(parseInjectKey("Enter", "\tcheck revenue\n")).toEqual({
      action: "submit",
      text: "check revenue",
    });
  });

  it("treats keys with different casing distinctly (not 'enter' or 'escape' in lowercase)", () => {
    // Keyboard events fire with canonical key names ("Enter", "Escape"), so
    // lowercase variants should be ignored — keeps the helper predictable
    // and avoids accidentally triggering on synthetic events.
    expect(parseInjectKey("enter", "hello")).toBeNull();
    expect(parseInjectKey("escape", "hello")).toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────────────────── */
/* InjectPrompt SSR scaffolding                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function render(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("InjectPrompt — SSR scaffolding", () => {
  it("renders nothing when open=false", () => {
    const html = renderToStaticMarkup(
      <InjectPrompt open={false} onClose={() => undefined} onSubmit={() => undefined} />,
    );
    expect(html).toBe("");
  });

  it("renders a dialog with the correct aria-label when open=true", () => {
    const doc = render(
      <InjectPrompt open={true} onClose={() => undefined} onSubmit={() => undefined} />,
    );
    const dialog = doc.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-label")).toBe(
      "Direct the CEO — inject a mid-orchestration directive",
    );
  });

  it("renders an input with the placeholder 'Direct the CEO...' when open", () => {
    const doc = render(
      <InjectPrompt open={true} onClose={() => undefined} onSubmit={() => undefined} />,
    );
    const input = doc.querySelector("input[type='text']");
    expect(input).not.toBeNull();
    expect(input?.getAttribute("placeholder")).toBe("Direct the CEO...");
    expect(input?.getAttribute("aria-label")).toBe("Directive for the CEO");
  });

  it("renders the inline hint telling the user how to submit/close", () => {
    const doc = render(
      <InjectPrompt open={true} onClose={() => undefined} onSubmit={() => undefined} />,
    );
    // The hint is a <span> containing the ENTER/ESC legend.
    const body = doc.body.textContent ?? "";
    expect(body).toContain("ENTER SEND");
    expect(body).toContain("ESC CLOSE");
  });

  it("marks the dialog as non-modal (injects layer above, not over)", () => {
    const doc = render(
      <InjectPrompt open={true} onClose={() => undefined} onSubmit={() => undefined} />,
    );
    const dialog = doc.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("false");
  });
});
