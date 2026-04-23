// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { shouldShowVoiceToggle } from "./DrillVoiceMic";

describe("shouldShowVoiceToggle", () => {
  it("shows when enabled and not permanently disabled", () => {
    expect(
      shouldShowVoiceToggle({ voiceEnabled: true, voicePermDisabled: false }),
    ).toBe(true);
  });

  it("hides when not enabled", () => {
    expect(
      shouldShowVoiceToggle({ voiceEnabled: false, voicePermDisabled: false }),
    ).toBe(false);
  });

  it("hides when enabled but permanently disabled", () => {
    expect(
      shouldShowVoiceToggle({ voiceEnabled: true, voicePermDisabled: true }),
    ).toBe(false);
  });

  it("hides when not enabled and permanently disabled", () => {
    expect(
      shouldShowVoiceToggle({ voiceEnabled: false, voicePermDisabled: true }),
    ).toBe(false);
  });
});
