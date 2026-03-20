/**
 * Sound Engine — procedural audio using the Web Audio API.
 * All sounds are synthesised from oscillators and noise; no audio files required.
 * Completely silent when disabled (default state).
 */

export type SoundId =
  | "elevator-ding"
  | "elevator-move"
  | "door-open"
  | "door-close"
  | "ambient-penthouse"
  | "ambient-war-room"
  | "ambient-situation-room"
  | "ambient-writing-room"
  | "ambient-briefing-room"
  | "ambient-rolodex"
  | "ambient-observatory"
  | "ambient-csuite"
  | "bell-ring"
  | "notification"
  | "milestone-unlock"
  | "typing"
  | "confetti";

interface ActiveAmbient {
  nodes: AudioNode[];
  gain: GainNode;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function noteHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// C4=60, E4=64, G4=67, C5=72, C5=72, E5=76
const C4 = noteHz(60);
const E4 = noteHz(64);
const G4 = noteHz(67);
const C5 = noteHz(72);
const E5 = noteHz(76);

// ── SoundEngine class ─────────────────────────────────────────────────────────

class SoundEngine {
  private ctx: AudioContext | null = null;
  private _enabled = false;
  private _volume = 0.3;
  private activeAmbient: ActiveAmbient | null = null;

  get enabled(): boolean {
    return this._enabled;
  }

  get volume(): number {
    return this._volume;
  }

  enable(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this._enabled = true;
  }

  disable(): void {
    this._enabled = false;
    this.stopAmbient();
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private getCtx(): AudioContext | null {
    if (!this._enabled || !this.ctx) return null;
    return this.ctx;
  }

  /** Master gain scaled by _volume */
  private masterGain(ctx: AudioContext): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(this._volume, ctx.currentTime);
    g.connect(ctx.destination);
    return g;
  }

  /** Create a sine oscillator, connected to a gain node */
  private osc(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType = "sine"
  ): OscillatorNode {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    return o;
  }

  /** White-noise buffer source */
  private noise(ctx: AudioContext): AudioBufferSourceNode {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  // ── One-shot sounds ─────────────────────────────────────────────────────────

  play(id: SoundId): void {
    const ctx = this.getCtx();
    if (!ctx) return;

    switch (id) {
      case "elevator-ding":
        this.playElevatorDing(ctx);
        break;
      case "elevator-move":
        this.playElevatorMove(ctx);
        break;
      case "door-open":
        this.playDoor(ctx, true);
        break;
      case "door-close":
        this.playDoor(ctx, false);
        break;
      case "bell-ring":
        this.playBellRing(ctx);
        break;
      case "notification":
        this.playNotification(ctx);
        break;
      case "milestone-unlock":
        this.playMilestoneUnlock(ctx);
        break;
      case "typing":
        this.playTyping(ctx);
        break;
      case "confetti":
        this.playConfetti(ctx);
        break;
      default:
        break;
    }
  }

  /** Elevator ding: C5 + E5 sine tones with quick attack/release */
  private playElevatorDing(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;

    [C5, E5].forEach((freq, i) => {
      const o = this.osc(ctx, freq);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.03);
      g.gain.linearRampToValueAtTime(0.35, now + i * 0.03 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.9);
      o.connect(g);
      g.connect(master);
      o.start(now + i * 0.03);
      o.stop(now + i * 0.03 + 1.0);
    });
  }

  /** Elevator move: low rumble with slight pitch drift */
  private playElevatorMove(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;

    const o = this.osc(ctx, 55, "sawtooth");
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.15);
    g.gain.setValueAtTime(0.15, now + 1.2);
    g.gain.linearRampToValueAtTime(0, now + 1.6);

    // Slight pitch drift for movement feel
    o.frequency.setValueAtTime(55, now);
    o.frequency.linearRampToValueAtTime(48, now + 0.8);
    o.frequency.linearRampToValueAtTime(52, now + 1.6);

    o.connect(filter);
    filter.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 1.8);
  }

  /** Door open/close: bandpass-filtered noise with quick envelope */
  private playDoor(ctx: AudioContext, opening: boolean): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;

    const noise = this.noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(opening ? 800 : 600, now);
    filter.Q.setValueAtTime(2, now);

    const g = ctx.createGain();
    const dur = 0.35;
    if (opening) {
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.2, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    } else {
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    }

    noise.connect(filter);
    filter.connect(g);
    g.connect(master);
    noise.start(now);
    noise.stop(now + dur + 0.05);
  }

  /** Bell ring: multiple harmonics, long decay */
  private playBellRing(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;
    // Fundamental + harmonics at relative amplitudes
    const harmonics: Array<[number, number]> = [
      [880, 0.4],
      [1318, 0.25],
      [1760, 0.18],
      [2637, 0.1],
      [3520, 0.06],
    ];

    harmonics.forEach(([freq, amp]) => {
      const o = this.osc(ctx, freq);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(amp, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
      o.connect(g);
      g.connect(master);
      o.start(now);
      o.stop(now + 3.6);
    });
  }

  /** Notification: two quick ascending tones */
  private playNotification(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;

    [noteHz(72), noteHz(79)].forEach((freq, i) => {
      const o = this.osc(ctx, freq);
      const g = ctx.createGain();
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.25);
    });
  }

  /** Milestone unlock: ascending arpeggio C4-E4-G4-C5 */
  private playMilestoneUnlock(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;

    [C4, E4, G4, C5].forEach((freq, i) => {
      const o = this.osc(ctx, freq, "triangle");
      const g = ctx.createGain();
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.55);
    });
  }

  /** Typing: very brief click */
  private playTyping(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;
    const noise = this.noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(3000, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(filter);
    filter.connect(g);
    g.connect(master);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  /** Confetti: bright celebratory sweep */
  private playConfetti(ctx: AudioContext): void {
    const master = this.masterGain(ctx);
    const now = ctx.currentTime;
    [C4, G4, C5, E5].forEach((freq, i) => {
      const o = this.osc(ctx, freq, "triangle");
      const g = ctx.createGain();
      const t = now + i * 0.07;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.linearRampToValueAtTime(freq * 1.02, t + 0.3);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.65);
    });
  }

  // ── Ambient soundscapes ─────────────────────────────────────────────────────

  playAmbient(floor: string): void {
    const ctx = this.getCtx();
    if (!ctx) return;

    this.stopAmbient();

    // Map floor id to ambient type
    const map: Record<string, () => ActiveAmbient> = {
      PH:  () => this.ambientPenthouse(ctx),
      "7": () => this.ambientWarRoom(ctx),
      "6": () => this.ambientSituationRoom(ctx),
      "5": () => this.ambientWritingRoom(ctx),
      "4": () => this.ambientBriefingRoom(ctx),
      "3": () => this.ambientRolodex(ctx),
      "2": () => this.ambientObservatory(ctx),
      "1": () => this.ambientCSuite(ctx),
    };

    const factory = map[floor];
    if (factory) {
      this.activeAmbient = factory();
    }
  }

  stopAmbient(): void {
    if (!this.activeAmbient) return;
    const { gain } = this.activeAmbient;
    const ctx = this.ctx;
    if (ctx) {
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);
      // Disconnect after fade
      setTimeout(() => {
        try {
          gain.disconnect();
        } catch {
          // already disconnected
        }
        this.activeAmbient?.nodes.forEach((n) => {
          try {
            (n as OscillatorNode | AudioBufferSourceNode).stop?.();
          } catch {
            // already stopped
          }
        });
      }, 1100);
    }
    this.activeAmbient = null;
  }

  /** Penthouse: warm low drone + soft wind texture */
  private ambientPenthouse(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.25, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // Low warm drone
    const drone = this.osc(ctx, 55, "sine");
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.6, ctx.currentTime);
    drone.connect(droneGain);
    droneGain.connect(master);
    drone.start();

    // Soft second harmonic
    const drone2 = this.osc(ctx, 82.5, "sine");
    const drone2Gain = ctx.createGain();
    drone2Gain.gain.setValueAtTime(0.2, ctx.currentTime);
    drone2.connect(drone2Gain);
    drone2Gain.connect(master);
    drone2.start();

    // Wind — filtered noise
    const wind = this.noise(ctx);
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.setValueAtTime(400, ctx.currentTime);
    windFilter.Q.setValueAtTime(0.5, ctx.currentTime);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.12, ctx.currentTime);
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start();

    return { nodes: [drone, drone2, wind], gain: master };
  }

  /** War Room: tense low hum + subtle radar ping */
  private ambientWarRoom(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.2, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // Tense low hum
    const hum = this.osc(ctx, 60, "sawtooth");
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = "lowpass";
    humFilter.frequency.setValueAtTime(120, ctx.currentTime);
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.4, ctx.currentTime);
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(master);
    hum.start();

    // Subtle radar ping every ~4s — schedule a series
    const scheduleRadar = () => {
      const o = this.osc(ctx, 880, "sine");
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      o.connect(g);
      g.connect(master);
      o.start(now);
      o.stop(now + 0.7);
    };
    scheduleRadar();
    const interval = setInterval(() => {
      if (!this.activeAmbient) { clearInterval(interval); return; }
      scheduleRadar();
    }, 4200);

    return { nodes: [hum], gain: master };
  }

  /** Situation Room: ticking clock + alert pulse */
  private ambientSituationRoom(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.2, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // Low background hum
    const hum = this.osc(ctx, 65, "sine");
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.15, ctx.currentTime);
    hum.connect(humGain);
    humGain.connect(master);
    hum.start();

    // Ticking clock — noise bursts at 1Hz
    const tick = () => {
      const n = this.noise(ctx);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(2200, ctx.currentTime);
      f.Q.setValueAtTime(8, ctx.currentTime);
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      n.connect(f); f.connect(g); g.connect(master);
      n.start(now); n.stop(now + 0.04);
    };
    tick();
    const interval = setInterval(() => {
      if (!this.activeAmbient) { clearInterval(interval); return; }
      tick();
    }, 1000);

    return { nodes: [hum], gain: master };
  }

  /** Writing Room: quiet, occasional soft pen scratch */
  private ambientWritingRoom(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.12, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // Very soft room noise
    const room = this.noise(ctx);
    const roomFilter = ctx.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.setValueAtTime(200, ctx.currentTime);
    const roomGain = ctx.createGain();
    roomGain.gain.setValueAtTime(0.06, ctx.currentTime);
    room.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(master);
    room.start();

    return { nodes: [room], gain: master };
  }

  /** Briefing Room: clean room hum */
  private ambientBriefingRoom(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.15, ctx.currentTime + 2);
    master.connect(ctx.destination);

    const hum = this.osc(ctx, 120, "sine");
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.12, ctx.currentTime);
    hum.connect(humGain);
    humGain.connect(master);
    hum.start();

    const hum2 = this.osc(ctx, 60, "sine");
    const hum2Gain = ctx.createGain();
    hum2Gain.gain.setValueAtTime(0.08, ctx.currentTime);
    hum2.connect(hum2Gain);
    hum2Gain.connect(master);
    hum2.start();

    return { nodes: [hum, hum2], gain: master };
  }

  /** Rolodex Lounge: soft jazz-like tones (slow arpeggiated chord) */
  private ambientRolodex(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.18, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // Jazz chord: Dm7 tones at low volume
    const jazzNotes = [noteHz(50), noteHz(57), noteHz(62), noteHz(65)];
    const oscs: OscillatorNode[] = jazzNotes.map((freq) => {
      const o = this.osc(ctx, freq, "triangle");
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      o.connect(g);
      g.connect(master);
      o.start();
      return o;
    });

    return { nodes: oscs, gain: master };
  }

  /** Observatory: cosmic hum + data processing blips */
  private ambientObservatory(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.2, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // Cosmic low drone
    const drone = this.osc(ctx, 40, "sine");
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.5, ctx.currentTime);
    drone.connect(droneGain);
    droneGain.connect(master);
    drone.start();

    // Occasional high blip
    const blip = () => {
      const o = this.osc(ctx, 1200 + Math.random() * 400, "sine");
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.connect(g); g.connect(master);
      o.start(now); o.stop(now + 0.18);
    };
    blip();
    const interval = setInterval(() => {
      if (!this.activeAmbient) { clearInterval(interval); return; }
      blip();
    }, 2800);

    return { nodes: [drone], gain: master };
  }

  /** C-Suite: authority hum + distant city texture */
  private ambientCSuite(ctx: AudioContext): ActiveAmbient {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this._volume * 0.2, ctx.currentTime + 2.5);
    master.connect(ctx.destination);

    // Authority hum — two detuned oscillators
    const hum1 = this.osc(ctx, 55, "sine");
    const hum2 = this.osc(ctx, 56.5, "sine");
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.4, ctx.currentTime);
    hum1.connect(humGain); hum2.connect(humGain);
    humGain.connect(master);
    hum1.start(); hum2.start();

    // City texture — filtered noise
    const city = this.noise(ctx);
    const cityFilter = ctx.createBiquadFilter();
    cityFilter.type = "lowpass";
    cityFilter.frequency.setValueAtTime(300, ctx.currentTime);
    const cityGain = ctx.createGain();
    cityGain.gain.setValueAtTime(0.08, ctx.currentTime);
    city.connect(cityFilter); cityFilter.connect(cityGain); cityGain.connect(master);
    city.start();

    return { nodes: [hum1, hum2, city], gain: master };
  }
}

export const soundEngine = new SoundEngine();
