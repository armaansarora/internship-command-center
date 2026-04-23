// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UndoBar } from "./UndoBar";
import type { UndoBarController, UndoBarState } from "./useUndoBarController";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function stubController(state: UndoBarState): UndoBarController {
  return {
    state,
    dispatch: () => {},
    cancel: async () => {},
    dismiss: () => {},
  };
}

function render(state: UndoBarState): Document {
  const html = renderToStaticMarkup(
    <UndoBar controller={stubController(state)} windowSeconds={30} />,
  );
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("UndoBar — in-world confirmation (no toast, no alert)", () => {
  it("renders nothing when idle", () => {
    const doc = render({
      phase: "idle",
      outreachId: null,
      recipient: null,
      sendAfterMs: null,
    });
    const bar = doc.querySelector("[data-undo-phase]");
    expect(bar).toBeNull();
  });

  it("renders in_flight copy + Cancel button with recipient", () => {
    const doc = render({
      phase: "in_flight",
      outreachId: "11111111-1111-4111-8111-111111111111",
      recipient: "alex@example.com",
      sendAfterMs: Date.now() + 30_000,
    });
    const bar = doc.querySelector('[data-undo-phase="in_flight"]');
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toMatch(/Outreach dispatched to alex@example\.com/);
    const button = doc.querySelector("button");
    expect(button?.textContent).toBe("Cancel");
  });

  it("renders cancelled confirmation with no Cancel button", () => {
    const doc = render({
      phase: "cancelled",
      outreachId: "22222222-2222-4222-8222-222222222222",
      recipient: "a@b.com",
      sendAfterMs: Date.now() + 30_000,
    });
    const bar = doc.querySelector('[data-undo-phase="cancelled"]');
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toMatch(/Caught it\. Still pending approval/);
    expect(doc.querySelector("button")).toBeNull();
  });

  it("renders too_late with alert role + 'Already left the building' copy", () => {
    const doc = render({
      phase: "too_late",
      outreachId: "33333333-3333-4333-8333-333333333333",
      recipient: "c@d.com",
      sendAfterMs: Date.now() + 30_000,
    });
    const bar = doc.querySelector('[data-undo-phase="too_late"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("role")).toBe("alert");
    expect(bar?.textContent).toMatch(/Already left the building/);
  });

  it("never emits the substring 'alert(' or 'toast(' in the rendered markup", () => {
    const states: UndoBarState[] = [
      { phase: "in_flight", outreachId: "x", recipient: "a@b.com", sendAfterMs: Date.now() + 30_000 },
      { phase: "cancelled", outreachId: "x", recipient: "a@b.com", sendAfterMs: Date.now() + 30_000 },
      { phase: "too_late", outreachId: "x", recipient: "a@b.com", sendAfterMs: Date.now() + 30_000 },
      { phase: "cancelling", outreachId: "x", recipient: "a@b.com", sendAfterMs: Date.now() + 30_000 },
    ];
    for (const s of states) {
      const html = renderToStaticMarkup(
        <UndoBar controller={stubController(s)} windowSeconds={30} />,
      );
      expect(html).not.toContain("alert(");
      expect(html).not.toContain("toast(");
    }
  });

  it("respects prefers-reduced-motion via @media rule", () => {
    const doc = render({
      phase: "in_flight",
      outreachId: "x",
      recipient: "a@b.com",
      sendAfterMs: Date.now() + 30_000,
    });
    expect(doc.documentElement.outerHTML).toMatch(/prefers-reduced-motion: reduce/);
  });
});
