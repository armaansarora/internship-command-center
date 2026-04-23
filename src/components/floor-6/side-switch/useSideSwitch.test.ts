// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { decideSideSwitch } from "./useSideSwitch";

function htmlEl(tag: string, contentEditable = false) {
  const el = document.createElement(tag);
  if (contentEditable) el.setAttribute("contenteditable", "true");
  return el;
}

describe("R8 P8 — decideSideSwitch", () => {
  it("[ -> cno", () => {
    expect(decideSideSwitch("[", null)).toBe("cno");
  });
  it("] -> cio", () => {
    expect(decideSideSwitch("]", null)).toBe("cio");
  });
  it("unrelated key -> null", () => {
    expect(decideSideSwitch("a", null)).toBeNull();
    expect(decideSideSwitch("Enter", null)).toBeNull();
    expect(decideSideSwitch("ArrowLeft", null)).toBeNull();
  });
  it("returns null when an INPUT is focused", () => {
    expect(decideSideSwitch("[", htmlEl("input"))).toBeNull();
    expect(decideSideSwitch("]", htmlEl("input"))).toBeNull();
  });
  it("returns null when a TEXTAREA is focused", () => {
    expect(decideSideSwitch("[", htmlEl("textarea"))).toBeNull();
  });
  it("returns null when a contenteditable is focused", () => {
    expect(decideSideSwitch("]", htmlEl("div", true))).toBeNull();
  });
});
