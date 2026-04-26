// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { CEOVoicePlayButton } from "@/components/parlor/CEOVoicePlayButton";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CEO voice three-layer gate invariant (PROOF).
 *
 * NON-NEGOTIABLE: The Read-aloud button MUST be gated by three independent
 * layers. If any one layer is red, the button MUST NOT render. If all
 * three are green, it MUST render. This test exists so a future developer
 * cannot accidentally collapse the gates (e.g. "the pref is true, just
 * render the button" — that would bypass Layer 3).
 *
 *   Layer 1 — Settings toggle (`enabled={false}` → null, always)
 *   Layer 3 — Browser support:
 *     3a — `window.speechSynthesis` is missing → null
 *     3b — `window.SpeechSynthesisUtterance` is missing → null
 *
 * Layer 2 (per-surface enable check) is enforced at the call site —
 * NegotiationDraftPanel threads `ceoVoiceEnabled` through the component
 * tree. Asserted separately by the wiring tests; the button itself just
 * honours the `enabled` prop it receives (which is Layer 1 seen from here).
 *
 * Each test carefully snapshots globalThis.speechSynthesis and
 * globalThis.SpeechSynthesisUtterance, mutates them for the scenario, and
 * restores in a try/finally so one test's damage doesn't bleed into the
 * next.
 */

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: React.ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function findButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>("button.ceo-voice-play");
}

const SYNTH_KEY = "speechSynthesis";
const UTT_KEY = "SpeechSynthesisUtterance";

function getGlobal(key: string): unknown {
  return (globalThis as unknown as Record<string, unknown>)[key];
}

function setGlobal(key: string, value: unknown): void {
  (globalThis as unknown as Record<string, unknown>)[key] = value;
}

function installFullStub(): void {
  const voices: SpeechSynthesisVoice[] = [
    {
      name: "Daniel",
      lang: "en-GB",
      default: false,
      localService: true,
      voiceURI: "Daniel",
    } as unknown as SpeechSynthesisVoice,
  ];
  const stub = {
    speak: () => undefined,
    cancel: () => undefined,
    getVoices: () => voices,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
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
  setGlobal(SYNTH_KEY, stub);
  setGlobal(UTT_KEY, StubUtterance);
}

let cleanups: Array<() => void> = [];

afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("CEO voice three-layer gate (PROOF)", () => {
  it("Layer 1: returns null when enabled=false (pref off), even with full browser support", () => {
    const realSynth = getGlobal(SYNTH_KEY);
    const realUtt = getGlobal(UTT_KEY);
    try {
      installFullStub();
      const m = mount(<CEOVoicePlayButton enabled={false} text="hi" />);
      cleanups.push(m.unmount);
      expect(findButton(m.host)).toBeNull();
    } finally {
      setGlobal(SYNTH_KEY, realSynth);
      setGlobal(UTT_KEY, realUtt);
    }
  });

  it("Layer 3a: returns null when window.speechSynthesis is missing (enabled=true)", () => {
    const realSynth = getGlobal(SYNTH_KEY);
    const realUtt = getGlobal(UTT_KEY);
    try {
      // speechSynthesis gone, SpeechSynthesisUtterance still present —
      // simulates a restricted iframe / hostile env.
      setGlobal(SYNTH_KEY, undefined);
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
      setGlobal(UTT_KEY, StubUtterance);

      const m = mount(<CEOVoicePlayButton enabled text="hi" />);
      cleanups.push(m.unmount);
      expect(findButton(m.host)).toBeNull();
    } finally {
      setGlobal(SYNTH_KEY, realSynth);
      setGlobal(UTT_KEY, realUtt);
    }
  });

  it("Layer 3b: returns null when SpeechSynthesisUtterance is missing (enabled=true)", () => {
    const realSynth = getGlobal(SYNTH_KEY);
    const realUtt = getGlobal(UTT_KEY);
    try {
      // speechSynthesis present, SpeechSynthesisUtterance gone — simulates
      // an unusual polyfill environment.
      const stub = {
        speak: () => undefined,
        cancel: () => undefined,
        getVoices: () => [] as SpeechSynthesisVoice[],
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      };
      setGlobal(SYNTH_KEY, stub);
      setGlobal(UTT_KEY, undefined);

      const m = mount(<CEOVoicePlayButton enabled text="hi" />);
      cleanups.push(m.unmount);
      expect(findButton(m.host)).toBeNull();
    } finally {
      setGlobal(SYNTH_KEY, realSynth);
      setGlobal(UTT_KEY, realUtt);
    }
  });

  it("Happy path: renders a button when enabled + speechSynthesis + SpeechSynthesisUtterance all present", () => {
    const realSynth = getGlobal(SYNTH_KEY);
    const realUtt = getGlobal(UTT_KEY);
    try {
      installFullStub();
      const m = mount(<CEOVoicePlayButton enabled text="hi" />);
      cleanups.push(m.unmount);
      const btn = findButton(m.host);
      expect(btn).not.toBeNull();
      expect(btn?.getAttribute("aria-label")).toBe("Read draft aloud");
    } finally {
      setGlobal(SYNTH_KEY, realSynth);
      setGlobal(UTT_KEY, realUtt);
    }
  });
});
