/**
 * R7.4 — Pneumatic-tube thunk synthesiser.
 *
 * One 80ms burst of bandpass-filtered white noise with an exponential
 * amplitude envelope. Built from primitives so no audio asset needs to be
 * shipped or decoded — the thunk plays instantly on first tube arrival.
 *
 * Design notes:
 *   - Bandpass @ 600Hz, Q=3 — narrow enough to suggest "wood / leather
 *     envelope hitting a brass landing pad," wide enough that the decay
 *     reads as thud rather than ping.
 *   - Envelope: 0.5 → 0.01 over 80ms, exponential. Exponential (not linear)
 *     so the tail rolls off naturally the way a real impact does.
 *   - Caller owns the AudioContext lifetime — we don't create or close it.
 *     That lets SoundProvider mute/resume at the engine level without the
 *     thunk synth having to know anything about SoundProvider state.
 *
 * Caller responsibility: `prefers-reduced-motion` and sound-enabled gating
 * live in the React component that calls this. Here we just synthesise.
 */

export function synthThunk(ctx: AudioContext): void {
  const t0 = ctx.currentTime;
  const duration = 0.08; // 80ms
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));

  // 1 — Generate an 80ms white-noise buffer. White noise is the cheapest
  //     broadband excitation that, once bandpassed, reads as percussive.
  const noiseBuffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // 2 — Bandpass @ 600Hz. Q=3 gives a ~200Hz bandwidth around the center,
  //     which is the thud register (below 600Hz = boomy, above = tinny).
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 600;
  filter.Q.value = 3;

  // 3 — Amplitude envelope. Start at 0.5 (leaves comfortable headroom
  //     against the master gain), decay exponentially to 0.01 by +80ms.
  //     exponentialRampToValueAtTime requires a strictly positive target;
  //     0.01 is effectively silence without hitting that constraint.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, t0);
  gain.gain.exponentialRampToValueAtTime(0.01, t0 + duration);

  // 4 — Wire: noise → filter → gain → destination. One-shot.
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t0);
  noise.stop(t0 + duration);
}
