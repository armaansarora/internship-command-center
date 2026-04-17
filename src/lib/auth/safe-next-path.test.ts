import { describe, it, expect } from "vitest";
import { getSafePostAuthPath } from "./safe-next-path";

describe("getSafePostAuthPath", () => {
  it("allows normal app paths", () => {
    expect(getSafePostAuthPath("/war-room")).toBe("/war-room");
    expect(getSafePostAuthPath("/penthouse")).toBe("/penthouse");
  });

  it("rejects tricks that could send users off-site", () => {
    expect(getSafePostAuthPath("//evil.com")).toBe("/penthouse");
    expect(getSafePostAuthPath("https://evil.com")).toBe("/penthouse");
    expect(getSafePostAuthPath("\\evil")).toBe("/penthouse");
  });

  it("uses default when missing or not a path", () => {
    expect(getSafePostAuthPath(null)).toBe("/penthouse");
    expect(getSafePostAuthPath("")).toBe("/penthouse");
    expect(getSafePostAuthPath("no-leading-slash")).toBe("/penthouse");
  });
});
