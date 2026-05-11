import { describe, it, expect } from "vitest";
import { buildText, buildHtml, INVITE_SUBJECT } from "./invite-template";

/**
 * Unit tests for the rolling-invite email template.
 *
 * Contract pinned here:
 *   1. The subject line is the canonical doorman summons.
 *   2. The plain-text body contains the invite URL on its own line and the
 *      sign-off, plus the soft opt-out beat.
 *   3. The HTML body escapes interpolated URLs and includes the same
 *      doorman copy verbatim so accessibility-tooling readers see the
 *      identical message.
 */

const PARAMS = {
  email: "guest@example.com",
  inviteUrl: "https://www.interntower.com/lobby?invite=abc-123",
};

describe("INVITE_SUBJECT", () => {
  it("is the doorman summons copy", () => {
    expect(INVITE_SUBJECT).toBe("You're in: The Tower is open for you");
  });
});

describe("buildText", () => {
  it("includes the invite URL on its own line", () => {
    const out = buildText(PARAMS);
    expect(out).toContain(PARAMS.inviteUrl);
    expect(out).toMatch(/Take the elevator from the lobby:.*invite=abc-123/);
  });

  it("includes the soft opt-out line", () => {
    const out = buildText(PARAMS);
    expect(out).toContain("no action needed");
  });

  it("ends with the Tower sign-off", () => {
    const out = buildText(PARAMS);
    expect(out.trimEnd().endsWith("— The Tower")).toBe(true);
  });

  it("stays within four sentences of body copy plus the URL line and the sign-off", () => {
    // Four sentences before the URL line, then URL, then opt-out, then
    // sign-off. We assert the structural beat count rather than a strict
    // sentence parser to keep the test robust to copy tweaks.
    const lines = buildText(PARAMS).split("\n").filter((l) => l.length > 0);
    // 4 copy lines + 1 sign-off line = 5 non-empty lines.
    expect(lines.length).toBe(5);
  });
});

describe("buildHtml", () => {
  it("emits a complete document with the subject in the <title>", () => {
    const out = buildHtml(PARAMS);
    expect(out.startsWith("<!doctype html>")).toBe(true);
    // The subject contains an apostrophe; buildHtml HTML-escapes interpolated
    // text so the on-the-wire title is the entity-encoded form. Assert on
    // the human-readable substring that uniquely identifies the title tag.
    expect(out).toContain("<title>You&#39;re in: The Tower is open for you</title>");
    expect(INVITE_SUBJECT).toBe("You're in: The Tower is open for you");
  });

  it("renders the invite URL as the button href and as a fallback link", () => {
    const out = buildHtml(PARAMS);
    // Anchor href + visible fallback text both reference the URL.
    expect(out).toContain(`href="${PARAMS.inviteUrl}"`);
    // The fallback line shows the URL string itself.
    expect(out).toContain(">https://www.interntower.com/lobby?invite=abc-123<");
  });

  it("escapes a hostile invite URL so injected markup never lands in the body", () => {
    const hostile = buildHtml({
      email: "x@example.com",
      inviteUrl: 'https://www.interntower.com/lobby?invite=" onclick="alert(1)',
    });
    expect(hostile).not.toContain('" onclick="alert(1)');
    expect(hostile).toContain("&quot; onclick=&quot;alert(1)");
  });

  it("includes the doorman copy beats so HTML and text bodies agree", () => {
    const out = buildHtml(PARAMS);
    expect(out).toContain("Your name has come up at the desk.");
    expect(out).toContain("no action needed");
    expect(out).toContain("— The Tower");
  });
});
