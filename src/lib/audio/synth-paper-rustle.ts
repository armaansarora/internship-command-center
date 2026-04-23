/**
 * R8.15 — Paper-rustle synthesiser.
 *
 * A short (110ms) high-passed noise burst with a soft envelope.  Plays
 * when the rolodex rotates past a card that has a private sticky-note
 * on it — the Brief's "sound when they lean closer."
 *
 * Design notes:
 *   - Highpass @ 2.2kHz, Q=0.9 — papery, not hissy.
 *   - Envelope: 0.22 → 0.005 over 110ms, exponential.  Quieter than the
 *     tube thunk so it reads as a secondary detail.
 *   - Two short grains separated by 40ms mimic the ear-catching
 *     two-part rustle of a note being lifted.
 *   - Caller owns the AudioContext lifetime.
 *
 * prefers-reduced-motion + sound-enabled gating live in the caller (the
 * rolodex hook).  This fn just synthesises.
 */

export function synthPaperRustle(ctx: AudioContext): void {
  const t0 = ctx.currentTime;
  scheduleGrain(ctx, t0, 0.05);
  scheduleGrain(ctx, t0 + 0.04, 0.06);
}

function scheduleGrain(ctx: AudioContext, when: number, duration: number): void {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));

  const buf = ctx.createBuffer(1, frameCount, sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    ch[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2200;
  filter.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22, when);
  gain.gain.exponentialRampToValueAtTime(0.005, when + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(when);
  noise.stop(when + duration);
}
