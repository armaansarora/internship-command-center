// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SideSwitch } from "./SideSwitch";

describe("R8 P8 — SideSwitch SSR render", () => {
  it("defaults to CNO side (data-side=cno)", () => {
    const markup = renderToStaticMarkup(
      <SideSwitch cnoSlot={<div>CNO body</div>} cioSlot={<div>CIO body</div>} />,
    );
    expect(markup).toMatch(/data-side="cno"/);
    expect(markup).toContain("CNO body");
    expect(markup).toContain("CIO body");
  });

  it("respects initial=cio", () => {
    const markup = renderToStaticMarkup(
      <SideSwitch
        cnoSlot={<div>CNO</div>}
        cioSlot={<div>CIO</div>}
        initial="cio"
      />,
    );
    expect(markup).toMatch(/data-side="cio"/);
  });

  it("exposes keyboard hint in the markup", () => {
    const markup = renderToStaticMarkup(
      <SideSwitch cnoSlot={null} cioSlot={null} />,
    );
    expect(markup).toContain("CNO");
    expect(markup).toContain("CIO");
  });

  it("role=region aria-label mentions both sides + the bracket keys", () => {
    const markup = renderToStaticMarkup(
      <SideSwitch cnoSlot={null} cioSlot={null} />,
    );
    expect(markup).toMatch(/role="region"/);
    expect(markup).toMatch(/press \[/);
    expect(markup).toMatch(/press \]/);
  });
});
