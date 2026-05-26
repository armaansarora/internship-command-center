import { loadArtLabFloorCanon } from "@/lib/artlab/sdk/canon";

export interface ArtLabFloorCanonEntry {
  slug: string;
  displayName: string;
  mood: string;
  palette: ReadonlyArray<string>;
  requiredElements: ReadonlyArray<string>;
  aspectRatio: "16:9" | "21:9" | "9:16" | "1:1";
  typography: string;
}

const ALLOWED_ASPECTS = new Set(["16:9", "21:9", "9:16", "1:1"]);

export async function loadArtLabFloorCanonEntry(
  floorSlug: string,
): Promise<ArtLabFloorCanonEntry> {
  const raw = await loadArtLabFloorCanon(floorSlug);
  if (!raw) {
    throw new Error(
      `artlab/floor-environment: no canon entry for ${floorSlug}`,
    );
  }
  if (!Array.isArray(raw.roomElements) || raw.roomElements.length === 0) {
    throw new Error(
      `artlab/floor-environment: roomElements required for ${floorSlug}`,
    );
  }
  if (!ALLOWED_ASPECTS.has(raw.aspectRatio)) {
    throw new Error(
      `artlab/floor-environment: bad aspectRatio ${raw.aspectRatio}`,
    );
  }
  return {
    slug: raw.slug,
    displayName: raw.displayName,
    mood: raw.mood,
    palette: [...raw.palette],
    requiredElements: [...raw.roomElements],
    aspectRatio: raw.aspectRatio as ArtLabFloorCanonEntry["aspectRatio"],
    typography: raw.typography,
  };
}
