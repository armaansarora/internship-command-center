// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";

import { shouldOpenInjectOnSlash } from "./CSuiteClient";

/**
 * R3.11 — unit tests for the `/`-inject activation gate.
 *
 * The `useEffect` inside CSuiteClient that listens for `keydown` events is
 * intentionally a thin wrapper around `shouldOpenInjectOnSlash`: the effect
 * reads `document.activeElement` + current state, hands them to the helper,
 * and only calls `setInjectOpen(true)` when the helper returns true.
 *
 * Covering the helper at every meaningful combination of its four inputs
 * gives us full coverage of the activation logic without needing to mount
 * the full component under a JSDOM window.
 */

/** Build a minimal HTMLElement stand-in with a given tag + contentEditable state. */
function makeElement(
  tag: string,
  contentEditable: boolean = false,
): HTMLElement {
  const el = document.createElement(tag);
  if (contentEditable) el.contentEditable = "true";
  return el;
}

describe("shouldOpenInjectOnSlash", () => {
  /* ─── Happy path ─────────────────────────────────────────────────────── */

  it("opens when orchestrating + dialogue open + inject closed + no input focus", () => {
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, null)).toBe(true);
  });

  it("opens when complete + dialogue open + inject closed + no input focus", () => {
    expect(shouldOpenInjectOnSlash("complete", true, false, null)).toBe(true);
  });

  it("opens when focus is on a plain <div> (not an editable element)", () => {
    const div = makeElement("div");
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, div)).toBe(true);
  });

  it("opens when focus is on a <button> (buttons aren't text inputs)", () => {
    const button = makeElement("button");
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, button)).toBe(true);
  });

  /* ─── Blocked by bell phase ──────────────────────────────────────────── */

  it("blocks when bell phase is 'idle' (nothing to direct)", () => {
    expect(shouldOpenInjectOnSlash("idle", true, false, null)).toBe(false);
  });

  it("blocks when bell phase is 'ringing' (bell still swinging — too early)", () => {
    expect(shouldOpenInjectOnSlash("ringing", true, false, null)).toBe(false);
  });

  /* ─── Blocked by dialogue state ──────────────────────────────────────── */

  it("blocks when the dialogue panel is closed (no chat to inject into)", () => {
    expect(shouldOpenInjectOnSlash("orchestrating", false, false, null)).toBe(false);
  });

  it("blocks when the dialogue panel is closed, even with bell complete", () => {
    expect(shouldOpenInjectOnSlash("complete", false, false, null)).toBe(false);
  });

  /* ─── Blocked by inject already open ─────────────────────────────────── */

  it("blocks when the inject prompt is already open (re-trigger guard)", () => {
    expect(shouldOpenInjectOnSlash("orchestrating", true, true, null)).toBe(false);
  });

  /* ─── Blocked by focused input ───────────────────────────────────────── */

  it("blocks when focus is on an <input>", () => {
    const input = makeElement("input");
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, input)).toBe(false);
  });

  it("blocks when focus is on a <textarea>", () => {
    const textarea = makeElement("textarea");
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, textarea)).toBe(false);
  });

  it("blocks when focus is on a contentEditable element", () => {
    const editable = makeElement("div", true);
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, editable)).toBe(false);
  });

  it("blocks when focus is on an <INPUT> with uppercase tagName (browser DOM quirk)", () => {
    // document.createElement normalises tagName to uppercase (per HTML spec).
    // The helper uses toLowerCase() to avoid being tag-case-sensitive.
    const input = makeElement("INPUT");
    expect(input.tagName).toBe("INPUT");
    expect(shouldOpenInjectOnSlash("orchestrating", true, false, input)).toBe(false);
  });

  /* ─── Combined guards (layered) ──────────────────────────────────────── */

  it("blocks when every guard would individually block (layered failure)", () => {
    const input = makeElement("input");
    expect(shouldOpenInjectOnSlash("idle", false, true, input)).toBe(false);
  });

  it("blocks when only dialogue is open but bell is idle (partial happy path)", () => {
    expect(shouldOpenInjectOnSlash("idle", true, false, null)).toBe(false);
  });
});
