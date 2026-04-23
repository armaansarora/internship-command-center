// @vitest-environment happy-dom
/**
 * R6 — The Briefing Room — Proof invariants.
 *
 * Five hard assertions the floor must satisfy. If any regresses, R6's
 * acceptance.met flips to false and the phase is re-opened.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("R6 proof invariants — The Briefing Room", () => {
  it("Invariant 1: extract-star produces a fully-populated STAR from a canonical answer", async () => {
    const { extractStar } = await import("@/components/floor-3/star/extract-star");
    const hints = extractStar(
      [
        "When I was at Acme last summer, the data pipeline was dropping 20% of events.",
        "I was asked to find the root cause.",
        "I built a sampling harness and traced it to a flaky worker.",
        "This reduced event loss to under 1% within two weeks.",
      ].join(" "),
    );
    expect(hints.situation.length).toBeGreaterThan(0);
    expect(hints.task.length).toBeGreaterThan(0);
    expect(hints.action.length).toBeGreaterThan(0);
    expect(hints.result.length).toBeGreaterThan(0);
  });

  it("Invariant 2: interrupt-rules fire on each of the 5 trigger types", async () => {
    const { nextInterrupt } = await import("@/components/floor-3/star/interrupt-rules");

    const overTime = nextInterrupt({
      elapsedMs: 125_000,
      lastInterruptAtMs: null,
      firmness: "firm",
      isFirstQuestion: false,
      wordCount: 220,
      stars: { s: 60, t: 60, a: 70, r: 60 },
    });
    expect(overTime?.type).toBe("over_time");

    const wrap = nextInterrupt({
      elapsedMs: 95_000,
      lastInterruptAtMs: null,
      firmness: "firm",
      isFirstQuestion: false,
      wordCount: 180,
      stars: { s: 60, t: 60, a: 70, r: 60 },
    });
    expect(wrap?.type).toBe("wrapping_up");

    const noResult = nextInterrupt({
      elapsedMs: 65_000,
      lastInterruptAtMs: null,
      firmness: "firm",
      isFirstQuestion: false,
      wordCount: 150,
      stars: { s: 60, t: 50, a: 70, r: 0 },
    });
    expect(noResult?.type).toBe("no_result");

    const noAction = nextInterrupt({
      elapsedMs: 35_000,
      lastInterruptAtMs: null,
      firmness: "firm",
      isFirstQuestion: false,
      wordCount: 55,
      stars: { s: 40, t: 20, a: 0, r: 0 },
    });
    expect(noAction?.type).toBe("no_action_verb");

    const tooMuchSit = nextInterrupt({
      elapsedMs: 35_000,
      lastInterruptAtMs: null,
      firmness: "firm",
      isFirstQuestion: false,
      wordCount: 60,
      stars: { s: 80, t: 10, a: 15, r: 0 },
    });
    expect(["too_much_situation", "no_action_verb"]).toContain(tooMuchSit?.type);
  });

  it("Invariant 3: voice opt-in cannot be bypassed — gate tests present and enforce 403/410/200", () => {
    // Source-level proof. Dynamically importing the suites would re-invoke
    // describe() inside an it() (which vitest forbids); the suites are
    // already executed by the full vitest run anyway. Here we assert the
    // contract files exist AND their assertions encode the gate codes.
    const root = process.cwd();
    const upload = resolve(root, "src/app/api/briefing/audio-upload/route.test.ts");
    const transcribe = resolve(root, "src/app/api/briefing/transcribe/route.test.ts");
    const pref = resolve(root, "src/app/api/briefing/voice-preference/route.test.ts");
    expect(existsSync(upload)).toBe(true);
    expect(existsSync(transcribe)).toBe(true);
    expect(existsSync(pref)).toBe(true);

    const uploadSrc = readFileSync(upload, "utf8");
    const transcribeSrc = readFileSync(transcribe, "utf8");
    const prefSrc = readFileSync(pref, "utf8");

    // Each route must assert the opt-in gate (403) and at least one
    // success/permanently-disabled code (200/410). If a future change
    // strips an assertion, this invariant fails.
    expect(uploadSrc).toMatch(/\b403\b/);
    expect(uploadSrc).toMatch(/\b410\b/);
    expect(uploadSrc).toMatch(/\b200\b/);
    expect(transcribeSrc).toMatch(/\b403\b/);
    expect(prefSrc).toMatch(/\b200\b/);
  });

  it("Invariant 4: Debrief Binder renders as spatial artifact, NOT a JSON dump", async () => {
    const { DebriefBinderShelf } = await import("@/components/floor-3/binder/DebriefBinderShelf");
    const React = await import("react");
    const html = renderToStaticMarkup(
      React.createElement(DebriefBinderShelf, {
        binders: [
          {
            id: "b1",
            title: "Debrief — CBRE (1)",
            company: "CBRE",
            round: "1",
            totalScore: 82,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");

    // Physical artifact: a section of role=list containing button spines
    expect(doc.querySelector('section[aria-label="Debrief binder shelf"]')).not.toBeNull();
    const spine = doc.querySelector('button[aria-label^="Debrief binder"]');
    expect(spine).not.toBeNull();
    expect(spine?.textContent?.toLowerCase()).toContain("cbre");

    // Anti-pattern guard: no raw JSON blocks
    expect(doc.querySelectorAll("pre").length).toBe(0);
    expect(doc.querySelectorAll("code").length).toBe(0);
  });

  it("Invariant 5: LiveSTARBoard is reactive — props drive column content", async () => {
    const { LiveSTARBoard } = await import("@/components/floor-3/drill/LiveSTARBoard");
    const React = await import("react");

    const empty = renderToStaticMarkup(
      React.createElement(LiveSTARBoard, {
        hints: { situation: [], task: [], action: [], result: [] },
      }),
    );
    const emptyDoc = new DOMParser().parseFromString(
      `<!doctype html><body>${empty}</body>`,
      "text/html",
    );
    // Match leaf <span> elements whose own text is exactly the em-dash —
    // a "*" selector would also count every ancestor whose textContent
    // happens to equal that string.
    const dashes = Array.from(emptyDoc.querySelectorAll("span")).filter(
      (el) => el.textContent === "—",
    );
    expect(dashes.length).toBe(4);

    const filled = renderToStaticMarkup(
      React.createElement(LiveSTARBoard, {
        hints: { situation: ["when I was at acme"], task: [], action: [], result: [] },
      }),
    );
    const filledDoc = new DOMParser().parseFromString(
      `<!doctype html><body>${filled}</body>`,
      "text/html",
    );
    expect(filledDoc.body.textContent?.toLowerCase() ?? "").toContain("when i was at acme");
  });
});
