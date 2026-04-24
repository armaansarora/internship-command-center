import { describe, it, expect } from "vitest";
import {
  readRejectionReflectionsPref,
  DEFAULT_REJECTION_REFLECTIONS_PREF,
  REJECTION_REFLECTIONS_PREF_KEY,
} from "./rejection-reflections-pref";

/**
 * R9.6 — Tests for the typed preference helper.
 *
 * Contract:
 *   - Default ON when input is null / undefined / non-object / wrong shape.
 *   - Reads { enabled: false } verbatim.
 *   - Reads { enabled: true } verbatim.
 *   - Ignores unrelated keys in the wrapping preferences blob (e.g. drill prefs).
 */

describe("readRejectionReflectionsPref — defaults", () => {
  it("returns the default when preferences is null", () => {
    expect(readRejectionReflectionsPref(null)).toEqual(
      DEFAULT_REJECTION_REFLECTIONS_PREF,
    );
  });

  it("returns the default when preferences is undefined", () => {
    expect(readRejectionReflectionsPref(undefined)).toEqual(
      DEFAULT_REJECTION_REFLECTIONS_PREF,
    );
  });

  it("returns the default when preferences is a string", () => {
    expect(readRejectionReflectionsPref("garbage")).toEqual(
      DEFAULT_REJECTION_REFLECTIONS_PREF,
    );
  });

  it("returns the default when the namespaced value is missing", () => {
    expect(readRejectionReflectionsPref({})).toEqual(
      DEFAULT_REJECTION_REFLECTIONS_PREF,
    );
  });

  it("returns the default when the namespaced value is the wrong shape", () => {
    expect(
      readRejectionReflectionsPref({
        [REJECTION_REFLECTIONS_PREF_KEY]: { enabled: "yes" },
      }),
    ).toEqual(DEFAULT_REJECTION_REFLECTIONS_PREF);
  });

  it("default is ON per partner constraint", () => {
    expect(DEFAULT_REJECTION_REFLECTIONS_PREF.enabled).toBe(true);
  });
});

describe("readRejectionReflectionsPref — valid shapes", () => {
  it("reads { enabled: false }", () => {
    expect(
      readRejectionReflectionsPref({
        [REJECTION_REFLECTIONS_PREF_KEY]: { enabled: false },
      }),
    ).toEqual({ enabled: false });
  });

  it("reads { enabled: true }", () => {
    expect(
      readRejectionReflectionsPref({
        [REJECTION_REFLECTIONS_PREF_KEY]: { enabled: true },
      }),
    ).toEqual({ enabled: true });
  });

  it("ignores unrelated keys alongside the namespaced value", () => {
    expect(
      readRejectionReflectionsPref({
        drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
        [REJECTION_REFLECTIONS_PREF_KEY]: { enabled: false },
        unknownKey: "whatever",
      }),
    ).toEqual({ enabled: false });
  });

  it("namespace key is the documented constant", () => {
    expect(REJECTION_REFLECTIONS_PREF_KEY).toBe("rejectionReflections");
  });
});
