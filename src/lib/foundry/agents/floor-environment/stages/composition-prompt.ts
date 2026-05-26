import type { FoundryFloorCanonEntry } from "../floor-canon";
import type { FoundryFloorTimeState } from "../types";

const TIME_STATE_CUES: Record<FoundryFloorTimeState, string> = {
  dawn: "pre-sunrise blue-hour ambient light, cool low-saturation, lights mostly off",
  morning: "soft golden morning light through windows, warm but restrained",
  midday: "bright neutral midday light, full saturation, crisp shadows",
  afternoon: "long warm afternoon rays, amber accents, deep contrast",
  dusk: "magic-hour dusk, mixed warm exterior + interior practicals, high cinematic mood",
  evening: "interior practicals carry the scene, exterior city lights through windows",
  night: "deep night, interior lamps as the only light source, rich blacks",
};

export function buildFoundryFloorCompositionPrompt(
  canon: FoundryFloorCanonEntry,
  timeState: FoundryFloorTimeState,
): string {
  const palette = canon.palette.join(", ");
  const elements = canon.requiredElements.map((e) => `- ${e}`).join("\n");
  return [
    `Painterly editorial environment art of "${canon.displayName}" of The Tower.`,
    `Mood: ${canon.mood}. Aspect ratio: ${canon.aspectRatio}.`,
    `Palette anchors: ${palette}.`,
    `Lighting state: ${TIME_STATE_CUES[timeState]}.`,
    "Required room elements (all must be present and recognisable):",
    elements,
    "No characters, no people, no figures. Background plate only.",
    "Single coherent composition; no collage, no text, no UI overlays.",
  ].join("\n");
}
