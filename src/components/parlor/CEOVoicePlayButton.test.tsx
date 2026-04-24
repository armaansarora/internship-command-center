// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R10.11 — CEOVoicePlayButton behavioral tests.
 *
 * Uses the project's manual createRoot + react act() pattern (no
 * @testing-library/react — see ParlorDoor.test.tsx, OfferFolder.test.tsx).
 *
 * The three-layer gate is additionally covered by the PROOF test at
 * src/app/__tests__/r10-ceo-voice-three-layer.proof.test.tsx. These tests
 * cover behavior around the happy path: play/stop toggle, onend reset,
 * cancel-on-unmount.
 */

import { CEOVoicePlayButton } from "./CEOVoicePlayButton";

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

/**
 * Install a minimal SpeechSynthesis + SpeechSynthesisUtterance polyfill on
 * `globalThis`. Tracks `speak`, `cancel`, voices list, and captures the
 * most-recent utterance so tests can trigger `onend` manually.
 */
interface SynthStub {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: () => SpeechSynthesisVoice[];
  voices: SpeechSynthesisVoice[];
  listeners: Map<string, EventListener[]>;
  addEventListener: (type: string, cb: EventListener) => void;
  removeEventListener: (type: string, cb: EventListener) => void;
  lastUtterance: { onend: (() => void) | null; onerror: (() => void) | null; text: string } | null;
}

function installSynth(): SynthStub {
  const voices: SpeechSynthesisVoice[] = [
    {
      name: "Daniel",
      lang: "en-GB",
      default: false,
      localService: true,
      voiceURI: "Daniel",
    } as unknown as SpeechSynthesisVoice,
  ];
  const listeners = new Map<string, EventListener[]>();

  const stub: SynthStub = {
    speak: vi.fn(),
    cancel: vi.fn(),
    voices,
    getVoices() {
      return this.voices;
    },
    listeners,
    addEventListener(type, cb) {
      const arr = listeners.get(type) ?? [];
      arr.push(cb);
      listeners.set(type, arr);
    },
    removeEventListener(type, cb) {
      const arr = listeners.get(type) ?? [];
      listeners.set(
        type,
        arr.filter((l) => l !== cb),
      );
    },
    lastUtterance: null,
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
      stub.lastUtterance = this as unknown as SynthStub["lastUtterance"];
    }
  }

  (globalThis as unknown as { speechSynthesis: SynthStub }).speechSynthesis = stub;
  (globalThis as unknown as { SpeechSynthesisUtterance: typeof StubUtterance }).SpeechSynthesisUtterance =
    StubUtterance;

  stub.speak.mockImplementation((u: unknown) => {
    stub.lastUtterance = u as SynthStub["lastUtterance"];
  });

  return stub;
}

let cleanups: Array<() => void> = [];
let savedSynth: unknown;
let savedUtt: unknown;

beforeEach(() => {
  cleanups = [];
  savedSynth = (globalThis as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  savedUtt = (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
});

afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
  (globalThis as unknown as { speechSynthesis?: unknown }).speechSynthesis = savedSynth;
  (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = savedUtt;
});

describe("CEOVoicePlayButton — gated render", () => {
  it("renders null when enabled=false even with full browser support", () => {
    installSynth();
    const m = mount(<CEOVoicePlayButton enabled={false} text="hi" />);
    cleanups.push(m.unmount);
    expect(findButton(m.host)).toBeNull();
  });

  it("renders null when speechSynthesis is missing (enabled=true)", () => {
    (globalThis as unknown as { speechSynthesis?: unknown }).speechSynthesis = undefined;
    (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = undefined;
    const m = mount(<CEOVoicePlayButton enabled text="hi" />);
    cleanups.push(m.unmount);
    expect(findButton(m.host)).toBeNull();
  });

  it("renders the button when enabled + full browser support", () => {
    installSynth();
    const m = mount(<CEOVoicePlayButton enabled text="hi" />);
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute("aria-label")).toMatch(/read draft aloud/i);
  });
});

describe("CEOVoicePlayButton — play/stop toggle", () => {
  it("calls speechSynthesis.speak() with a tuned utterance on click", () => {
    const stub = installSynth();
    const m = mount(<CEOVoicePlayButton enabled text="Negotiation draft body." />);
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    if (!btn) throw new Error("button not rendered");
    act(() => {
      btn.click();
    });
    expect(stub.speak).toHaveBeenCalledTimes(1);
    const u = stub.lastUtterance;
    expect(u?.text).toBe("Negotiation draft body.");
  });

  it("flips aria-pressed to true after starting", () => {
    installSynth();
    const m = mount(<CEOVoicePlayButton enabled text="hi" />);
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    if (!btn) throw new Error("button not rendered");
    act(() => {
      btn.click();
    });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.textContent).toMatch(/stop/i);
  });

  it("stops when clicked a second time (calls cancel) and flips aria-pressed back", () => {
    const stub = installSynth();
    const m = mount(<CEOVoicePlayButton enabled text="hi" />);
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    if (!btn) throw new Error("button not rendered");
    act(() => {
      btn.click();
    });
    act(() => {
      btn.click();
    });
    expect(stub.cancel).toHaveBeenCalled();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("resets aria-pressed when the browser fires utterance.onend", () => {
    const stub = installSynth();
    const m = mount(<CEOVoicePlayButton enabled text="hi" />);
    cleanups.push(m.unmount);
    const btn = findButton(m.host);
    if (!btn) throw new Error("button not rendered");
    act(() => {
      btn.click();
    });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    // Simulate the browser finishing the utterance.
    act(() => {
      stub.lastUtterance?.onend?.();
    });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("CEOVoicePlayButton — cancels on unmount", () => {
  it("calls speechSynthesis.cancel() when unmounted mid-speech", () => {
    const stub = installSynth();
    const m = mount(<CEOVoicePlayButton enabled text="hi" />);
    const btn = findButton(m.host);
    if (!btn) throw new Error("button not rendered");
    act(() => {
      btn.click();
    });
    // Unmount while "playing" — should cancel to avoid zombie audio.
    act(() => {
      m.root.unmount();
    });
    m.host.remove();
    expect(stub.cancel).toHaveBeenCalled();
  });
});
