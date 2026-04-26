/**
 * synthThunk unit tests.
 *
 * We don't need real audio here — the invariants are structural:
 *   - the filter is configured correctly (bandpass, 600Hz, Q=3)
 *   - the envelope is correctly specified (0.5 @ t0, 0.01 @ t0+0.08)
 *   - the noise source starts exactly once
 *
 * Using a hand-rolled AudioContext mock keeps this test environment-
 * agnostic (no need for happy-dom / jsdom to provide WebAudio).
 */
import { describe, it, expect, vi } from "vitest";
import { synthThunk } from "./synth-thunk";

interface MockAudioParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
}

function param(): MockAudioParam {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

interface MockBuffer {
  length: number;
  channels: Float32Array[];
  getChannelData: (i: number) => Float32Array;
}

function makeCtx(sampleRate = 48000, currentTime = 0) {
  const destination = {};
  const filterNode = {
    type: "" as BiquadFilterType | string,
    frequency: param(),
    Q: param(),
    connect: vi.fn(),
  };
  const gainNode = {
    gain: param(),
    connect: vi.fn(),
  };
  const noiseNode = {
    buffer: null as MockBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const createdBuffers: MockBuffer[] = [];

  const ctx = {
    currentTime,
    sampleRate,
    destination,
    createBuffer(_channels: number, length: number): MockBuffer {
      const data = new Float32Array(length);
      const buf: MockBuffer = {
        length,
        channels: [data],
        getChannelData: () => data,
      };
      createdBuffers.push(buf);
      return buf;
    },
    createBufferSource: vi.fn(() => noiseNode),
    createBiquadFilter: vi.fn(() => filterNode),
    createGain: vi.fn(() => gainNode),
  };

  return { ctx, filterNode, gainNode, noiseNode, destination, createdBuffers };
}

describe("synthThunk", () => {
  it("configures the bandpass filter at 600Hz with Q=3", () => {
    const { ctx, filterNode } = makeCtx();
    synthThunk(ctx as unknown as AudioContext);
    expect(filterNode.type).toBe("bandpass");
    expect(filterNode.frequency.value).toBe(600);
    expect(filterNode.Q.value).toBe(3);
  });

  it("schedules the amplitude envelope: 0.5 at t0, 0.01 at t0+0.08", () => {
    const { ctx, gainNode } = makeCtx(48000, 10);
    synthThunk(ctx as unknown as AudioContext);
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalledTimes(1);
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 10);
    expect(gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(1);
    const [target, when] = gainNode.gain.exponentialRampToValueAtTime.mock.calls[0];
    expect(target).toBe(0.01);
    expect(when).toBeCloseTo(10.08, 5);
  });

  it("starts the noise source exactly once", () => {
    const { ctx, noiseNode } = makeCtx();
    synthThunk(ctx as unknown as AudioContext);
    expect(noiseNode.start).toHaveBeenCalledTimes(1);
  });

  it("wires noise → filter → gain → destination", () => {
    const { ctx, filterNode, gainNode, noiseNode, destination } = makeCtx();
    synthThunk(ctx as unknown as AudioContext);
    expect(noiseNode.connect).toHaveBeenCalledWith(filterNode);
    expect(filterNode.connect).toHaveBeenCalledWith(gainNode);
    expect(gainNode.connect).toHaveBeenCalledWith(destination);
  });

  it("fills an 80ms noise buffer at the context sample rate", () => {
    const { ctx, createdBuffers } = makeCtx(48000);
    synthThunk(ctx as unknown as AudioContext);
    expect(createdBuffers).toHaveLength(1);
    // 48000 * 0.08 = 3840
    expect(createdBuffers[0].length).toBe(3840);
  });
});
