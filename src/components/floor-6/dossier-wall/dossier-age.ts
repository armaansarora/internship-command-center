export type DossierAge = "fresh" | "aging" | "stale";

/**
 * R8 §5.1 — dossier freshness tiers.  Fresh (< 7 days) is a crisp white
 * page; aging (7–29 days) yellows subtly and the corner lifts; stale
 * (30+ days or never researched) is fully yellowed with a visible curl.
 */
export function computeDossierAge(
  lastResearchedAt: Date | null,
  now: Date,
): DossierAge {
  if (!lastResearchedAt) return "stale";
  const days = Math.floor(
    (now.getTime() - lastResearchedAt.getTime()) / 86_400_000,
  );
  if (days < 7) return "fresh";
  if (days < 30) return "aging";
  return "stale";
}

export interface DossierAgeStyle {
  bg: string;
  filter: string;
  shadow: string;
  label: string;
}

export const DOSSIER_AGE_STYLE: Record<DossierAge, DossierAgeStyle> = {
  fresh: {
    bg: "#FDF7E8",
    filter: "none",
    shadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
    label: "Fresh",
  },
  aging: {
    bg: "#F0E5C8",
    filter: "sepia(0.15) saturate(0.9)",
    shadow: "0 2px 5px rgba(0, 0, 0, 0.22)",
    label: "Aging",
  },
  stale: {
    bg: "#E6D8AA",
    filter: "sepia(0.3) saturate(0.8) hue-rotate(-5deg)",
    shadow: "0 4px 10px rgba(0, 0, 0, 0.32)",
    label: "Stale — refresh pending",
  },
};
