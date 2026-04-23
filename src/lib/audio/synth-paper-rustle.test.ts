import { describe, it, expect, vi } from "vitest";
import { synthPaperRustle } from "./synth-paper-rustle";

/**
 * We can't test the audio output directly — we test the wiring: that
 * the synth creates two buffer sources (two grains), each routed through
 * a highpass filter, each with an exponential decay.
 */
describe("synthPaperRustle", () => {
  it("schedules two short highpass-filtered grains", () => {
    const bufferSources: Array<{ started: boolean; stopped: boolean }> = [];
    const highpassCreated: string[] = [];

    const fakeCtx = {
      currentTime: 0,
      sampleRate: 44100,
      createBuffer: (_ch: number, frames: number, sr: number) => ({
        getChannelData: () => new Float32Array(frames),
        length: frames,
        sampleRate: sr,
      }),
      createBufferSource: () => {
        const src = {
          buffer: null as AudioBuffer | null,
          started: false,
          stopped: false,
          connect: vi.fn(),
          start(_when: number) { this.started = true; },
          stop(_when: number) { this.stopped = true; },
        };
        bufferSources.push(src);
        return src;
      },
      createBiquadFilter: () => {
        const f = {
          type: "highpass",
          frequency: { value: 0 },
          Q: { value: 0 },
          connect: vi.fn(),
        };
        highpassCreated.push(f.type);
        return f;
      },
      createGain: () => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }),
      destination: {},
    } as unknown as AudioContext;

    synthPaperRustle(fakeCtx);

    expect(bufferSources).toHaveLength(2);
    expect(bufferSources.every((b) => b.started && b.stopped)).toBe(true);
    expect(highpassCreated).toEqual(["highpass", "highpass"]);
  });
});
