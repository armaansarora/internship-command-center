/**
 * ActivateClient smoke test.
 *
 * The full activation gauntlet (intake → source → working → delivered) is
 * exercised by higher-level integration coverage. This smoke file only
 * asserts that Phase A renders the three intake fields + a submit button
 * with the expected accessible names, so any future refactor that breaks
 * the static intake shape gets caught at CI time.
 *
 * Server actions are mocked so the render never touches Supabase.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../actions", () => ({
  recordIntakeAction: vi.fn(),
  importFirstApplicationAction: vi.fn(),
  dispatchActivationCROAction: vi.fn(),
  pollActivationDispatchAction: vi.fn(),
}));

import { ActivateClient } from "../activate-client";

describe("ActivateClient (smoke)", () => {
  it("renders the activation surface with a phase attribute", () => {
    const html = renderToStaticMarkup(
      <ActivateClient userId="u-1" userName="Armaan" />,
    );
    expect(html).toContain('aria-label="Tower activation"');
    expect(html).toMatch(/data-phase="intake"/);
  });

  it("renders Phase A with roles, level, geos inputs and a submit button", () => {
    const html = renderToStaticMarkup(
      <ActivateClient userId="u-1" userName="Armaan" />,
    );

    // Field labels (heading + each control).
    expect(html).toContain("Roles you want");
    expect(html).toContain("Where you are");
    expect(html).toContain("Cities or remote");

    // Level radio options.
    expect(html).toContain("Intern");
    expect(html).toContain("New grad");
    expect(html).toContain("Early career");

    // Skip affordance is visible from second 1.
    expect(html).toMatch(/aria-label="Skip activation"/);

    // The submit button + step indicator.
    expect(html).toContain("Lock in targets");
    expect(html).toContain("Step 1 of 3");
  });

  it("greets the user by their resolved name when one is available", () => {
    const html = renderToStaticMarkup(
      <ActivateClient userId="u-1" userName="Armaan" />,
    );
    expect(html).toContain("Welcome, Armaan.");
  });

  it("falls back to a neutral greeting when the user name is empty", () => {
    const html = renderToStaticMarkup(
      <ActivateClient userId="u-1" userName="" />,
    );
    expect(html).toContain("Welcome to The Tower.");
  });
});
