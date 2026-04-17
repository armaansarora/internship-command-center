import { describe, it, expect } from "vitest";
import { getSafePostAuthPath } from "./safe-next-path";

describe("getSafePostAuthPath", () => {
  it("returns default when next is null/empty", () => {
    expect(getSafePostAuthPath(null)).toBe("/penthouse");
    expect(getSafePostAuthPath("")).toBe("/penthouse");
  });

  it("accepts safe relative paths", () => {
    expect(getSafePostAuthPath("/war-room")).toBe("/war-room");
    expect(getSafePostAuthPath("/floor-2/observatory")).toBe(
      "/floor-2/observatory"
    );
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafePostAuthPath("//evil.example")).toBe("/penthouse");
  });

  it("rejects scheme-prefixed URLs", () => {
    expect(getSafePostAuthPath("https://evil.example")).toBe("/penthouse");
    expect(getSafePostAuthPath("javascript:alert(1)")).toBe("/penthouse");
  });

  it("rejects paths with embedded backslashes", () => {
    expect(getSafePostAuthPath("/ok\\path")).toBe("/penthouse");
  });

  it("rejects paths that don't start with /", () => {
    expect(getSafePostAuthPath("dashboard")).toBe("/penthouse");
  });
});
