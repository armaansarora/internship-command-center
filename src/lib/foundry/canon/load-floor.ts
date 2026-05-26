export interface FoundryFloorCanonRaw {
  slug: string;
  displayName: string;
  mood: string;
  palette: ReadonlyArray<string>;
  roomElements: ReadonlyArray<string>;
  aspectRatio: "16:9" | "21:9" | "9:16" | "1:1";
  typography: string;
}

const FLOOR_ENTRIES: Record<string, FoundryFloorCanonRaw> = {
  penthouse: {
    slug: "penthouse",
    displayName: "The Penthouse",
    mood: "executive-still",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: ["panoramic-windows", "executive-desk", "city-skyline-view"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  "war-room": {
    slug: "war-room",
    displayName: "The War Room",
    mood: "tactical-luxury",
    palette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
    roomElements: ["wall-mounted-boards", "leather-chairs", "globe"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  "rolodex-lounge": {
    slug: "rolodex-lounge",
    displayName: "The Rolodex Lounge",
    mood: "warm-relational",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: [
      "rolodex-card-stack",
      "low-leather-seating",
      "warm-pendant-lights",
    ],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  "writing-room": {
    slug: "writing-room",
    displayName: "The Writing Room",
    mood: "editorial-poised",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: ["writing-desk", "fountain-pen", "paper-stacks", "warm-lamp"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  "situation-room": {
    slug: "situation-room",
    displayName: "The Situation Room",
    mood: "operations-brisk",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: ["wall-clocks", "calendar-displays", "briefing-table"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  "briefing-room": {
    slug: "briefing-room",
    displayName: "The Briefing Room",
    mood: "prep-focused",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: ["prep-whiteboard", "dossier-stacks", "briefing-podium"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  observatory: {
    slug: "observatory",
    displayName: "The Observatory",
    mood: "analytical-precise",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: [
      "telescope",
      "data-charts-on-glass-walls",
      "observation-deck",
    ],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  "c-suite": {
    slug: "c-suite",
    displayName: "The C-Suite",
    mood: "still-architectural",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: ["corner-office-desk", "marble-floor", "cityscape-window"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
  lobby: {
    slug: "lobby",
    displayName: "The Lobby",
    mood: "warm-arrival",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: [
      "concierge-desk",
      "polished-floor",
      "warm-pendant-lights",
    ],
    aspectRatio: "16:9",
    typography: "playfair-display",
  },
};

export async function loadFoundryFloorCanon(
  slug: string,
): Promise<FoundryFloorCanonRaw | null> {
  return FLOOR_ENTRIES[slug] ?? null;
}

export const FOUNDRY_FLOOR_CANON_SLUGS = Object.freeze(
  Object.keys(FLOOR_ENTRIES),
);
