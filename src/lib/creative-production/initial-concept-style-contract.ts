export const CHARACTER_INITIAL_CONCEPT_POSITIVE_STYLE_ANCHORS = [
  "premium web-game dialogue sprite",
  "crisp non-photoreal character render",
  "high-contrast lobby lighting",
  "rich burgundy/brass/deep navy palette",
  "detailed fabric seams/buttons/hair/beard",
  "sharp readable silhouette",
  "polished modern game UI character art",
] as const;

export const CHARACTER_INITIAL_CONCEPT_NEGATIVE_STYLE_ANCHORS = [
  "no storybook illustration",
  "no children’s book",
  "no watercolor",
  "no muted pastel palette",
  "no beige editorial board",
  "no flat vector simplicity",
  "no low-detail soft linework",
  "no generic cozy illustration",
] as const;

export const CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR =
  "Every initial concept lane must hit the same minimum quality/detail floor: Lane 05-level material detail, fabric seams, buttons, hair/beard rendering, brass highlights, confident contrast, dimensional lighting, and high-resolution premium game-sprite finish.";

export const CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE =
  "Lane variation is only for identity direction: silhouette, age impression, posture, personality, uniform cut, props, warmth, and eccentricity. Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish.";

export function renderCharacterInitialConceptStyleQualityContract(): string {
  return `## Initial-Concept Style Quality Contract

Use this as a reusable quality contract for character identity concept boards before any production pack exists.

Positive style anchors:
${CHARACTER_INITIAL_CONCEPT_POSITIVE_STYLE_ANCHORS.map((anchor) => `- ${anchor}`).join("\n")}

Negative style anchors:
${CHARACTER_INITIAL_CONCEPT_NEGATIVE_STYLE_ANCHORS.map((anchor) => `- ${anchor}`).join("\n")}

Shared lane quality floor:
- ${CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR}

Allowed lane variation:
- ${CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE}

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.
`;
}

export function renderCharacterInitialConceptApiStyleInstructions(): string[] {
  return [
    `Style quality: ${CHARACTER_INITIAL_CONCEPT_POSITIVE_STYLE_ANCHORS.join("; ")}.`,
    `Reject these looks: ${CHARACTER_INITIAL_CONCEPT_NEGATIVE_STYLE_ANCHORS.join("; ")}.`,
    `Shared lane quality floor: ${CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR}`,
    `Identity variation rule: ${CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE}`,
    "Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.",
  ];
}
