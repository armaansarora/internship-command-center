/**
 * Pure helpers for the CEO read-aloud feature.
 *
 * Voice selection + utterance construction live here so they can be tested
 * without mounting a component, stubbing the DOM, or wiring a preference.
 * The button component (`CEOVoicePlayButton`) is a thin shell around these
 * two functions.
 *
 * NO cloud TTS. Voice playback uses `window.speechSynthesis` ONLY. The
 * partner constraint for R10 is hard: ElevenLabs, OpenAI TTS, Cartesia,
 * Deepgram and every other paid TTS is drift. Browser synthesis keeps the
 * feature free, private-by-default (local on most platforms), and
 * gracefully degradable — the three-layer gate on the button side ensures
 * missing synthesis renders nothing rather than failing.
 */

/**
 * Pick the best available CEO voice from the browser's voices list.
 *
 * Preferred (in order): Daniel (en-GB, warm baritone on macOS/iOS), Alex
 * (en-US, classic macOS male), Fred (en-US, slower drawl), Google US
 * English Male. If none of those are present, fall back to the first en-US
 * voice, then any en-* voice, then null (no English voice available — the
 * caller should silently not render the play button).
 */
export function pickCeoVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const preferNames = ["Daniel", "Alex", "Fred", "Google US English Male"];
  for (const name of preferNames) {
    const v = voices.find(
      (x) => x.lang?.startsWith("en") && x.name.includes(name),
    );
    if (v) return v;
  }
  return (
    voices.find((x) => x.lang?.startsWith("en-US")) ??
    voices.find((x) => x.lang?.startsWith("en")) ??
    null
  );
}

/**
 * Build a SpeechSynthesisUtterance tuned to the CEO's voice character:
 *   - rate 0.95  (just-under-conversational, deliberate)
 *   - pitch 0.92 (slightly lower than default; steadier tone)
 *   - volume 1   (user controls system volume)
 *
 * Callers are expected to attach their own `onend` / `onerror` handlers
 * before passing the returned utterance to `speechSynthesis.speak()`.
 */
export function buildCeoUtterance(
  text: string,
  voice: SpeechSynthesisVoice | null,
): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 0.92;
  u.volume = 1;
  return u;
}
