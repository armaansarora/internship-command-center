import { loadFoundryFloorCanon } from "@/lib/artlab/sdk/canon";

export interface FoundryFloorCanonEntry {
  slug: string;
  displayName: string;
  mood: string;
  palette: ReadonlyArray<string>;
  requiredElements: ReadonlyArray<string>;
  aspectRatio: "16:9" | "21:9" | "9:16" | "1:1";
  typography: string;
}

const ALLOWED_ASPECTS = new Set(["16:9", "21:9", "9:16", "1:1"]);

export async function loadFoundryFloorCanonEntry(
  floorSlug: string,
): Promise<FoundryFloorCanonEntry> {
  const raw = await loadFoundryFloorCanon(floorSlug);
  if (!raw) {
    throw new Error(
      `foundry/floor-environment: no canon entry for ${floorSlug}`,
    );
  }
  if (!Array.isArray(raw.roomElements) || raw.roomElements.length === 0) {
    throw new Error(
      `foundry/floor-environment: roomElements required for ${floorSlug}`,
    );
  }
  if (!ALLOWED_ASPECTS.has(raw.aspectRatio)) {
    throw new Error(
      `foundry/floor-environment: bad aspectRatio ${raw.aspectRatio}`,
    );
  }
  return {
    slug: raw.slug,
    displayName: raw.displayName,
    mood: raw.mood,
    palette: [...raw.palette],
    requiredElements: [...raw.roomElements],
    aspectRatio: raw.aspectRatio as FoundryFloorCanonEntry["aspectRatio"],
    typography: raw.typography,
  };
}
