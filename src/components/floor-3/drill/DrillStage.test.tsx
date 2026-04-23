// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DrillStage } from "./DrillStage";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// The SSR render never fires useEffect, so fetch is not called; but we
// stub it anyway to avoid network surprises inside jsdom/happy-dom envs.
beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    // Pending promise — render path returns "Loading drill…" before any
    // resolution happens.
    new Promise(() => {
      /* intentionally never resolves for this static render */
    }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function render(): Document {
  const html = renderToStaticMarkup(
    <DrillStage
      interviewId="00000000-0000-0000-0000-000000000001"
      voiceEnabled={false}
      voicePermDisabled={false}
      firmness="firm"
      timerSeconds={90}
      onComplete={() => {
        /* noop */
      }}
    />,
  );
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("DrillStage (SSR render)", () => {
  it("renders a region with the correct aria-label", () => {
    const doc = render();
    const region = doc.querySelector(
      'section[role="region"][aria-label="CPO drill stage"]',
    );
    expect(region).not.toBeNull();
  });

  it("renders the loading placeholder before the start-drill fetch resolves", () => {
    const doc = render();
    const text = doc.body.textContent ?? "";
    expect(text).toMatch(/Loading drill/i);
  });

  it("initial render is aria-busy=true", () => {
    const doc = render();
    const region = doc.querySelector('[role="region"]');
    expect(region?.getAttribute("aria-busy")).toBe("true");
  });
});
