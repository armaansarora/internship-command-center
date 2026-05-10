import { describe, it, expect } from "vitest";
import {
  FOCUS_MODE_COOKIE_NAME,
  FOCUS_MODE_COOKIE_MAX_AGE,
  parseFocusModeCookie,
} from "./config";

describe("parseFocusModeCookie", () => {
  it("returns false when the cookie is undefined", () => {
    expect(parseFocusModeCookie(undefined)).toBe(false);
  });

  it("returns true for exact value '1'", () => {
    expect(parseFocusModeCookie("1")).toBe(true);
  });

  it("returns false for value '0'", () => {
    expect(parseFocusModeCookie("0")).toBe(false);
  });

  it("returns false for any other string (defensive default)", () => {
    expect(parseFocusModeCookie("garbage")).toBe(false);
    expect(parseFocusModeCookie("true")).toBe(false);
    expect(parseFocusModeCookie("")).toBe(false);
    expect(parseFocusModeCookie(" 1")).toBe(false);
  });
});

describe("focus-mode constants", () => {
  it("uses the locked cookie name", () => {
    expect(FOCUS_MODE_COOKIE_NAME).toBe("tower_focus_mode");
  });

  it("uses a one-year max age", () => {
    expect(FOCUS_MODE_COOKIE_MAX_AGE).toBe(31_536_000);
  });
});
