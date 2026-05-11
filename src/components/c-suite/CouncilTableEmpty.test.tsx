// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CouncilTableEmpty } from "./CouncilTableEmpty";

/**
 * Tests for the Council Table empty state.
 *
 * Verifies:
 *   1. The required brief copy appears verbatim ("No council convenings
 *      yet" + the "The CEO will summon a table..." line).
 *   2. The empty surface is an aria-live="polite" status region so screen
 *      readers announce when a council later arrives in the same page.
 *   3. A test id is present so parents can detect the empty path.
 */
function render(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("CouncilTableEmpty", () => {
  it("renders the required headline", () => {
    const doc = render(<CouncilTableEmpty />);
    expect(doc.querySelector("h3")?.textContent?.trim()).toBe(
      "No council convenings yet.",
    );
  });

  it("renders the explanatory copy from the brief", () => {
    const doc = render(<CouncilTableEmpty />);
    const text = doc.body.textContent ?? "";
    expect(text).toContain(
      "The CEO will summon a table when work fans out across departments",
    );
  });

  it("exposes the surface as a polite live region for assistive tech", () => {
    const doc = render(<CouncilTableEmpty />);
    const section = doc.querySelector('[data-testid="council-table-empty"]');
    expect(section).not.toBeNull();
    expect(section?.getAttribute("role")).toBe("status");
    expect(section?.getAttribute("aria-live")).toBe("polite");
  });

  it("renders a Council Table eyebrow label", () => {
    const doc = render(<CouncilTableEmpty />);
    const text = doc.body.textContent ?? "";
    expect(text).toContain("Council Table");
  });
});
