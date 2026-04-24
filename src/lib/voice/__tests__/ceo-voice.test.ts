// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from "vitest";
import { pickCeoVoice, buildCeoUtterance } from "../ceo-voice";

/**
 * R10.11 — Pure-helper tests for CEO voice selection + utterance building.
 *
 * These are stateless, side-effect-free helpers: the whole point of pulling
 * them out of the component is that they're trivially testable without
 * needing to touch the DOM or stub the SpeechSynthesis API. The component's
 * three-layer gate is covered separately in:
 *   - CEOVoicePlayButton.test.tsx (the component itself)
 *   - src/app/__tests__/r10-ceo-voice-three-layer.proof.test.tsx
 *
 * happy-dom does NOT provide `SpeechSynthesisUtterance` as a constructor we
 * can call. We stub it on `globalThis` once for this file so
 * `buildCeoUtterance` has something to construct.
 */

type TestVoice = {
  name: string;
  lang: string;
  default?: boolean;
  localService?: boolean;
  voiceURI?: string;
};

function makeVoice(name: string, lang: string): SpeechSynthesisVoice {
  const v: TestVoice = { name, lang, default: false, localService: true, voiceURI: name };
  return v as unknown as SpeechSynthesisVoice;
}

beforeAll(() => {
  // Stub SpeechSynthesisUtterance if happy-dom hasn't provided one.
  // Build a minimal constructor that captures the `text` arg and exposes
  // the five fields `buildCeoUtterance` sets.
  if (typeof (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance === "undefined") {
    class StubUtterance {
      text: string;
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    (globalThis as unknown as { SpeechSynthesisUtterance: typeof StubUtterance }).SpeechSynthesisUtterance =
      StubUtterance;
  }
});

describe("pickCeoVoice", () => {
  it("prefers Daniel when present (en-GB)", () => {
    const voices = [
      makeVoice("Samantha", "en-US"),
      makeVoice("Daniel", "en-GB"),
      makeVoice("Karen", "en-AU"),
    ];
    const picked = pickCeoVoice(voices);
    expect(picked?.name).toBe("Daniel");
  });

  it("falls back to Alex then Fred then Google US English Male", () => {
    // No Daniel → pick Alex.
    const withAlex = [
      makeVoice("Samantha", "en-US"),
      makeVoice("Alex", "en-US"),
      makeVoice("Karen", "en-AU"),
    ];
    expect(pickCeoVoice(withAlex)?.name).toBe("Alex");

    // No Daniel, no Alex → pick Fred.
    const withFred = [
      makeVoice("Samantha", "en-US"),
      makeVoice("Fred", "en-US"),
    ];
    expect(pickCeoVoice(withFred)?.name).toBe("Fred");

    // Only the "Google US English Male" one.
    const withGoogle = [
      makeVoice("Samantha", "en-US"),
      makeVoice("Google US English Male", "en-US"),
    ];
    expect(pickCeoVoice(withGoogle)?.name).toBe("Google US English Male");
  });

  it("falls back to any en-US voice when none of the preferred names are present", () => {
    const voices = [
      makeVoice("Karen", "en-AU"),
      makeVoice("Victoria", "en-US"),
    ];
    expect(pickCeoVoice(voices)?.name).toBe("Victoria");
  });

  it("falls back to any en-* voice when no en-US is present", () => {
    const voices = [
      makeVoice("Karen", "en-AU"),
      makeVoice("Sabine", "de-DE"),
    ];
    expect(pickCeoVoice(voices)?.name).toBe("Karen");
  });

  it("returns null for empty voices list", () => {
    expect(pickCeoVoice([])).toBeNull();
  });

  it("returns null when no English voice is available", () => {
    const voices = [
      makeVoice("Sabine", "de-DE"),
      makeVoice("Amelie", "fr-FR"),
    ];
    expect(pickCeoVoice(voices)).toBeNull();
  });
});

describe("buildCeoUtterance", () => {
  it("builds with rate=0.95, pitch=0.92, volume=1", () => {
    const u = buildCeoUtterance("Hello", null);
    expect(u.rate).toBeCloseTo(0.95, 5);
    expect(u.pitch).toBeCloseTo(0.92, 5);
    expect(u.volume).toBe(1);
  });

  it("uses the text param as the spoken content", () => {
    const u = buildCeoUtterance("Draft goes here.", null);
    expect(u.text).toBe("Draft goes here.");
  });

  it("sets voice when provided", () => {
    const voice = makeVoice("Daniel", "en-GB");
    const u = buildCeoUtterance("Hi", voice);
    expect(u.voice).toBe(voice);
  });

  it("leaves voice null when null is passed", () => {
    const u = buildCeoUtterance("Hi", null);
    // In the stub we initialise voice to null; in real SpeechSynthesisUtterance
    // it defaults to null too. Either way it must not be a truthy voice.
    expect(u.voice).toBeNull();
  });
});
