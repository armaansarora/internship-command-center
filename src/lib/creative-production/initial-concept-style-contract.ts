import type { CreativeAssetType } from "./types";

export const TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_HEADER =
  "## Shared Tower Character Style Envelope";
export const TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_FOOTER =
  "## End Shared Tower Character Style Envelope";

export const TOWER_CHARACTER_CONCEPT_DESIGN_AXES = [
  "silhouette",
  "age read",
  "hair shape/length/texture",
  "facial structure",
  "wardrobe category",
  "color palette",
  "posture/body language",
  "accessories/tools",
  "personality read",
  "Tower role archetype",
] as const;

export const TOWER_CHARACTER_CONCEPT_FORBIDDEN_PROMPT_TERMS = [
  "hyperreal",
  "photo",
  "photograph",
  "photoreal",
  "actual person",
  "real person",
  "person-like",
  "storybook",
  "watercolor",
  "pastel",
  "flat cartoon",
  "corporate stock",
  "stock photo",
] as const;

const FORBIDDEN_PROMPT_PATTERNS = [
  { term: "hyperreal", pattern: /\bhyperreal(?:istic|ism)?\b/i },
  { term: "photo", pattern: /\bphoto\b/i },
  { term: "photograph", pattern: /\bphotograph(?:y|ic|er|s)?\b/i },
  { term: "photoreal", pattern: /\bphotoreal(?:istic|ism)?\b/i },
  { term: "actual person", pattern: /\bactual person\b/i },
  { term: "real person", pattern: /\breal person\b/i },
  { term: "person-like", pattern: /\bperson-like\b/i },
  { term: "storybook", pattern: /\bstorybook\b/i },
  { term: "watercolor", pattern: /\bwatercolor\b/i },
  { term: "pastel", pattern: /\bpastel\b/i },
  { term: "flat cartoon", pattern: /\bflat cartoon\b/i },
  { term: "corporate stock", pattern: /\bcorporate stock\b/i },
  { term: "stock photo", pattern: /\bstock photo\b/i },
] as const;

export const CHARACTER_INITIAL_CONCEPT_POSITIVE_STYLE_ANCHORS = [
  "premium stylized high-detail app/game character art",
  "Otis-compatible Tower character style",
  "crisp painterly raster shapes with controlled dimensional depth",
  "strong readable full-body silhouette",
  "luxury Tower palette with burgundy, brass, deep navy, graphite, and ivory restraint",
  "detailed fabric construction, hair rendering, face detail, and polished material edges",
  "modern premium game UI dialogue-sprite finish",
] as const;

export const CHARACTER_INITIAL_CONCEPT_NEGATIVE_STYLE_ANCHORS = [
  "no lens-captured realism",
  "no nursery-book illustration drift",
  "no washed pigment media look",
  "no powder-soft color wash",
  "no plain vector toon simplification",
  "no low-detail soft linework",
  "no generic office stock-asset gloss",
] as const;

export const CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR =
  "Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.";

export const CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE =
  `Variation is allowed only inside these character-design axes: ${TOWER_CHARACTER_CONCEPT_DESIGN_AXES.join(", ")}. Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit.`;

export interface TowerCharacterInitialConceptDesignCard {
  label: string;
  silhouette: string;
  ageRead: string;
  hairShapeLengthTexture: string;
  facialStructure: string;
  wardrobeCategory: string;
  colorPalette: string;
  postureBodyLanguage: string;
  accessoriesTools: string;
  personalityRead: string;
  towerRoleArchetype: string;
}

export interface TowerCharacterConceptPromptQaFailure {
  slotId: string;
  code: string;
  message: string;
}

export interface TowerCharacterConceptPromptQaReport {
  status: "passed" | "failed";
  failures: TowerCharacterConceptPromptQaFailure[];
  repeatedFailureCodes: string[];
}

const OTIS_INITIAL_DESIGN_CARDS: readonly TowerCharacterInitialConceptDesignCard[] = [
  {
    label: "Warm Classic Concierge",
    silhouette: "medium-tall rounded rectangle with relaxed shoulders and welcoming stance",
    ageRead: "late 50s to early 60s",
    hairShapeLengthTexture: "neat silver hair with compact side volume and a trimmed beard",
    facialStructure: "soft square face, kind eyes, lived-in smile lines",
    wardrobeCategory: "heritage hotel cardigan layered over crisp concierge shirt",
    colorPalette: "deep navy, burgundy, antique brass, warm white",
    postureBodyLanguage: "open chest, one hand lifted in greeting, feet grounded",
    accessoriesTools: "brass key ring, small lapel badge, folded welcome card",
    personalityRead: "warm, observant, quietly capable",
    towerRoleArchetype: "classic lobby guardian",
  },
  {
    label: "Retired Showman",
    silhouette: "slightly taller pear-shaped silhouette with expressive hands",
    ageRead: "early 60s",
    hairShapeLengthTexture: "swept-back silver hair with expressive brows and a tidy beard",
    facialStructure: "longer face, lifted cheeks, animated eyes",
    wardrobeCategory: "restrained velvet concierge jacket with refined shirt and trousers",
    colorPalette: "wine, charcoal, brass, cream",
    postureBodyLanguage: "theatrical half-turn with one hand presenting the Tower",
    accessoriesTools: "polished cane umbrella and brass watch chain",
    personalityRead: "charming, theatrical, still deeply competent",
    towerRoleArchetype: "old-stage host turned operator",
  },
  {
    label: "Neighborhood Elder",
    silhouette: "shorter rounder body with soft shoulders and familiar warmth",
    ageRead: "mid 60s",
    hairShapeLengthTexture: "soft silver curls around the temples with a fuller beard",
    facialStructure: "round face, broad nose, patient eyes, deep smile lines",
    wardrobeCategory: "comfortable premium knit blazer over concierge uniform pieces",
    colorPalette: "deep green, warm burgundy, muted brass, ivory",
    postureBodyLanguage: "gentle forward lean as if listening carefully",
    accessoriesTools: "small notebook, pencil, old brass room tag",
    personalityRead: "patient, protective, community-rooted",
    towerRoleArchetype: "trusted front-desk elder",
  },
  {
    label: "Elegant Old Guard",
    silhouette: "tall narrow column with precise shoulders and dignified balance",
    ageRead: "late 50s",
    hairShapeLengthTexture: "immaculate silver side part with short beard and clean edges",
    facialStructure: "angular cheekbones, straight nose, composed mouth",
    wardrobeCategory: "formal old-world concierge tailoring with brass details",
    colorPalette: "black navy, oxblood, antique brass, white",
    postureBodyLanguage: "upright stillness, hands folded behind back",
    accessoriesTools: "polished badge, white gloves tucked at wrist",
    personalityRead: "disciplined, dignified, quietly kind",
    towerRoleArchetype: "grand hotel old guard",
  },
  {
    label: "Cozy Oddball Mentor",
    silhouette: "compact asymmetrical silhouette with memorable glasses and soft layers",
    ageRead: "early 60s",
    hairShapeLengthTexture: "loose silver waves, soft beard, slightly eccentric grooming",
    facialStructure: "oval face, warm eyes, distinctive nose, gentle asymmetry",
    wardrobeCategory: "premium layered cardigan, patterned scarf, tidy trousers",
    colorPalette: "plum, navy, brass, moss green",
    postureBodyLanguage: "relaxed lean with one eyebrow raised and a tiny smile",
    accessoriesTools: "round glasses, key charm, annotated clipboard",
    personalityRead: "offbeat, brilliant, emotionally safe",
    towerRoleArchetype: "lovable mentor concierge",
  },
] as const;

const MARA_INITIAL_DESIGN_CARDS: readonly TowerCharacterInitialConceptDesignCard[] = [
  {
    label: "Knife-Edge Chairwoman",
    silhouette: "tall narrow angular column with razor-straight shoulders",
    ageRead: "early 50s",
    hairShapeLengthTexture: "long silver-black blunt bob tucked behind one ear",
    facialStructure: "high cheekbones, long nose, watchful eyes, precise mouth",
    wardrobeCategory: "asymmetric architectural coat over structured tunic and wide trousers",
    colorPalette: "ink black, oxblood, antique brass",
    postureBodyLanguage: "still upright command, one hand clasping the other",
    accessoriesTools: "thin brass keycard stack and dark glass tablet",
    personalityRead: "controlled, intimidating, exacting",
    towerRoleArchetype: "C-Suite founder-operator",
  },
  {
    label: "War-Room Rainmaker",
    silhouette: "compact athletic forward-leaning triangle",
    ageRead: "late 30s",
    hairShapeLengthTexture: "coiled shoulder-length curls pulled to one side",
    facialStructure: "square jaw, tired bright eyes, strong brow, alert expression",
    wardrobeCategory: "rolled-sleeve silk blouse, cropped utility vest, tailored cargo trousers",
    colorPalette: "deep navy, warm copper, ivory",
    postureBodyLanguage: "mid-stride crisis-command energy with decisive hands",
    accessoriesTools: "annotated tablet, stylus, emergency floor badge",
    personalityRead: "restless, brilliant, direct",
    towerRoleArchetype: "deal-room crisis commander",
  },
  {
    label: "Velvet Strategist",
    silhouette: "soft-power hourglass with draped diagonal lines",
    ageRead: "mid 40s",
    hairShapeLengthTexture: "waist-length black braid with a brass clasp",
    facialStructure: "oval face, sharp eyes, full mouth, calm assessing gaze",
    wardrobeCategory: "luxe wrap jacket, long split skirt, structured boots",
    colorPalette: "plum, deep teal, brushed gold",
    postureBodyLanguage: "relaxed contrapposto, one hand holding a closed folio",
    accessoriesTools: "fountain pen, contract folio, slim signet ring",
    personalityRead: "seductive strategist, patient, dangerous",
    towerRoleArchetype: "boardroom dealmaker",
  },
  {
    label: "Glasshouse Technocrat",
    silhouette: "short precise rectangular silhouette with clean geometric edges",
    ageRead: "mid 30s",
    hairShapeLengthTexture: "asymmetric pixie undercut with one glossy wave",
    facialStructure: "sharp brow, narrow chin, intense eyes, controlled expression",
    wardrobeCategory: "monochrome jumpsuit, translucent long coat, geometric belt",
    colorPalette: "charcoal, cool white, signal red",
    postureBodyLanguage: "one hand in pocket, the other marking a system diagram",
    accessoriesTools: "AR monocle, red stylus, tiny brass cuff",
    personalityRead: "coldly inventive, surgical, future-facing",
    towerRoleArchetype: "systems CEO",
  },
  {
    label: "Old-Money Firebrand",
    silhouette: "broad grounded cape-backed silhouette with regal weight",
    ageRead: "late 50s",
    hairShapeLengthTexture: "natural silver coils shaped into a sculptural crown",
    facialStructure: "strong nose, deep smile lines, calm direct gaze",
    wardrobeCategory: "structured capelet, high-neck knit, pleated trousers",
    colorPalette: "forest green, cream, antique brass",
    postureBodyLanguage: "feet planted, chin lifted, pointer angled toward the viewer",
    accessoriesTools: "cane-like pointer, signet ring, embossed floor dossier",
    personalityRead: "warm menace, inherited power, reformer fire",
    towerRoleArchetype: "dynasty reformer",
  },
] as const;

const RAFE_INITIAL_DESIGN_CARDS: readonly TowerCharacterInitialConceptDesignCard[] = [
  {
    label: "Pipeline Streetfighter",
    silhouette: "forward-leaning athletic wedge with one shoulder already moving",
    ageRead: "late 30s",
    hairShapeLengthTexture: "short dark textured hair pushed back by motion",
    facialStructure: "sharp brows, square jaw, tired alert eyes, half-smirk held back",
    wardrobeCategory: "rolled-sleeve shirt, loosened tie, tailored trousers, loud sneakers",
    colorPalette: "deep navy, white, signal red, scuffed brass",
    postureBodyLanguage: "one foot forward, torso angled toward the next conversion problem",
    accessoriesTools: "red pen held like a pointer, folded pipeline card, marker cap",
    personalityRead: "hungry, allergic to passivity, generous under pressure",
    towerRoleArchetype: "streetwise conversion fighter",
  },
  {
    label: "Red-Pen Operator",
    silhouette: "tall narrow slash with active elbows and restless hands",
    ageRead: "early 40s",
    hairShapeLengthTexture: "close-cropped curls with a controlled side fade",
    facialStructure: "long face, expressive brow ridge, skeptical mouth, bright eyes",
    wardrobeCategory: "tactical sales jacket over crisp shirt, sleeves shoved up",
    colorPalette: "charcoal, oxblood red, ivory, electric blue accent",
    postureBodyLanguage: "leaning over an invisible resume line, pen raised mid-correction",
    accessoriesTools: "red stylus, clipped edit cards, slim tablet angled away from body",
    personalityRead: "blunt, surgical, impossible to bore",
    towerRoleArchetype: "application demolition lead",
  },
  {
    label: "Conversion Coach",
    silhouette: "compact spring-loaded rectangle with open coaching gesture",
    ageRead: "mid 30s",
    hairShapeLengthTexture: "messy swept hair with one stubborn front lock",
    facialStructure: "broad cheekbones, quick grin, intense brows, lived-in under-eye detail",
    wardrobeCategory: "premium track-jacket blazer hybrid over open-collar work shirt",
    colorPalette: "ink blue, cream, copper, bright red accent",
    postureBodyLanguage: "half-crouched encouraging lean, one palm open and one pen ready",
    accessoriesTools: "small whiteboard marker, red pen, pipeline score card",
    personalityRead: "competitive, funny, demanding because he cares",
    towerRoleArchetype: "high-energy conversion coach",
  },
  {
    label: "War-Room Closer",
    silhouette: "broad-shouldered diagonal stance with sharp triangular jacket shape",
    ageRead: "early 40s",
    hairShapeLengthTexture: "short wavy hair with a clean hard part",
    facialStructure: "strong nose, concentrated eyes, tense smile lines, expressive brows",
    wardrobeCategory: "cropped tactical jacket, rolled black shirt sleeves, tailored utility pants",
    colorPalette: "black navy, slate, red, muted brass",
    postureBodyLanguage: "marker pointed toward a decision, body angled like a countdown",
    accessoriesTools: "red marker, folded offer sheet, clipped floor badge",
    personalityRead: "decisive, loud, protective through pressure",
    towerRoleArchetype: "war-room closing captain",
  },
  {
    label: "Honest Pressure Mentor",
    silhouette: "looser athletic silhouette with relaxed shoulders and quick hands",
    ageRead: "mid 40s",
    hairShapeLengthTexture: "salt-and-pepper textured waves with slight temple volume",
    facialStructure: "kind tired eyes, strong brow, crooked smile, weathered face detail",
    wardrobeCategory: "soft tactical cardigan over rolled-sleeve shirt and clean sneakers",
    colorPalette: "deep green, navy, ivory, red pen accent",
    postureBodyLanguage: "forward lean softened by one open hand and one correcting pen",
    accessoriesTools: "red pencil, annotated follow-up card, tiny brass whistle charm",
    personalityRead: "older-brother honesty, impatient with dead ends, secretly tender",
    towerRoleArchetype: "protective momentum mentor",
  },
] as const;

const GENERIC_CHARACTER_INITIAL_DESIGN_CARDS: readonly TowerCharacterInitialConceptDesignCard[] = [
  {
    label: "Angular Operator",
    silhouette: "tall angular silhouette with a memorable shoulder shape",
    ageRead: "early 40s",
    hairShapeLengthTexture: "long dark side-parted hair with a sharp clean edge",
    facialStructure: "narrow face, high cheekbones, focused eyes",
    wardrobeCategory: "architectural long coat over modern workwear",
    colorPalette: "graphite, burgundy, brass",
    postureBodyLanguage: "controlled stillness with contained tension",
    accessoriesTools: "tablet and small brass badge",
    personalityRead: "precise, demanding, quietly protective",
    towerRoleArchetype: "strategic floor operator",
  },
  {
    label: "Grounded Mentor",
    silhouette: "rounder grounded silhouette with soft but clear shapes",
    ageRead: "late 50s",
    hairShapeLengthTexture: "textured gray curls with visible volume",
    facialStructure: "broad face, kind eyes, lived-in expression",
    wardrobeCategory: "premium knit layers over tailored basics",
    colorPalette: "deep green, navy, warm brass",
    postureBodyLanguage: "gentle forward lean with open hands",
    accessoriesTools: "notebook and pen",
    personalityRead: "wise, steady, emotionally intelligent",
    towerRoleArchetype: "trusted mentor",
  },
  {
    label: "Restless Specialist",
    silhouette: "compact athletic silhouette with asymmetrical details",
    ageRead: "mid 30s",
    hairShapeLengthTexture: "short textured hair with one longer sweep",
    facialStructure: "square jaw, alert eyes, focused mouth",
    wardrobeCategory: "layered technical vest and sharp trousers",
    colorPalette: "deep navy, copper, ivory",
    postureBodyLanguage: "mid-step, ready to move",
    accessoriesTools: "stylus and clipped access card",
    personalityRead: "fast, intense, ingenious",
    towerRoleArchetype: "specialist operator",
  },
  {
    label: "Lux Diplomat",
    silhouette: "flowing draped silhouette with elegant diagonals",
    ageRead: "late 40s",
    hairShapeLengthTexture: "long braided hair with polished clasp",
    facialStructure: "oval face, composed eyes, expressive mouth",
    wardrobeCategory: "wrapped formal layers with tailored boots",
    colorPalette: "plum, teal, brushed gold",
    postureBodyLanguage: "relaxed contrapposto with a calm hand gesture",
    accessoriesTools: "folio and signet detail",
    personalityRead: "patient, charming, hard to fool",
    towerRoleArchetype: "diplomatic power broker",
  },
  {
    label: "Systems Rebel",
    silhouette: "short rectangular silhouette with crisp geometric rhythm",
    ageRead: "late 20s to early 30s",
    hairShapeLengthTexture: "asymmetric cropped hair with glossy texture",
    facialStructure: "sharp brow, small chin, bright direct eyes",
    wardrobeCategory: "sleek utility jumpsuit with translucent outer layer",
    colorPalette: "charcoal, white, red accent",
    postureBodyLanguage: "casual one-hand-pocket confidence",
    accessoriesTools: "tiny headset and red stylus",
    personalityRead: "irreverent, brilliant, impatient",
    towerRoleArchetype: "systems disruptor",
  },
] as const;

function normalizedPromptName(name: string, prompt: string): string {
  return `${name} ${prompt}`.toLowerCase();
}

export function getTowerCharacterInitialConceptDesignCards(input: {
  name: string;
  prompt: string;
}): readonly TowerCharacterInitialConceptDesignCard[] {
  const name = input.name.toLowerCase();
  const text = normalizedPromptName(input.name, input.prompt);

  if (/\bmara\b/.test(name)) return MARA_INITIAL_DESIGN_CARDS;
  if (/\botis\b/.test(name)) return OTIS_INITIAL_DESIGN_CARDS;
  if (/\brafe\b/.test(name)) return RAFE_INITIAL_DESIGN_CARDS;
  if (/\bmara\b/.test(text)) return MARA_INITIAL_DESIGN_CARDS;
  if (/\botis\b/.test(text)) return OTIS_INITIAL_DESIGN_CARDS;
  if (/\brafe\b|\bcro\b/.test(text)) return RAFE_INITIAL_DESIGN_CARDS;

  return GENERIC_CHARACTER_INITIAL_DESIGN_CARDS;
}

export function renderTowerCharacterSharedStyleEnvelope(): string {
  return [
    TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_HEADER,
    "Style target: premium stylized high-detail app/game character art in the Otis-compatible Tower character style.",
    "Rendering language: crisp painterly raster forms, controlled dimensional depth, detailed fabric construction, expressive face detail, polished hair rendering, and clean material edges.",
    "Camera/framing: full-body 9:16 character concept, straight-on three-quarter app sprite view, generous breathing room, no cropped hair, hands, feet, or held tools.",
    "Lighting: controlled Tower lobby lighting with confident contrast, soft brass highlights, and clear foreground/background separation.",
    "Tower-world fit: adult professional energy, Professional Scars tone, luxury internship command-center taste, grounded specificity, no generic office stock-asset gloss.",
    `Shared quality floor: ${CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR}`,
    "The style envelope is identical for every lane. Only the lane design card may vary.",
    TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_FOOTER,
  ].join("\n");
}

export function renderTowerCharacterDesignVariationMatrix(): string {
  return [
    "Design variation matrix:",
    `Allowed variation axes: ${TOWER_CHARACTER_CONCEPT_DESIGN_AXES.join("; ")}.`,
    "Locked across lanes: rendering style, finish quality, camera/framing, lighting, backdrop discipline, source model, and Tower-world fit.",
    "Do not collapse all lanes into the same suit, same short hair, same corporate leader silhouette, or same role archetype.",
  ].join("\n");
}

export function renderTowerCharacterLaneDesignCard(
  card: TowerCharacterInitialConceptDesignCard,
): string {
  return [
    "Lane design card:",
    `- label: ${card.label}`,
    `- silhouette: ${card.silhouette}`,
    `- age read: ${card.ageRead}`,
    `- hair shape/length/texture: ${card.hairShapeLengthTexture}`,
    `- facial structure: ${card.facialStructure}`,
    `- wardrobe category: ${card.wardrobeCategory}`,
    `- color palette: ${card.colorPalette}`,
    `- posture/body language: ${card.postureBodyLanguage}`,
    `- accessories/tools: ${card.accessoriesTools}`,
    `- personality read: ${card.personalityRead}`,
    `- Tower role archetype: ${card.towerRoleArchetype}`,
  ].join("\n");
}

export function renderCharacterInitialConceptStyleQualityContract(): string {
  return `## Initial-Concept Character Style Contract

Use this contract for Tower character identity concept boards before any production pack exists.

Positive style anchors:
${CHARACTER_INITIAL_CONCEPT_POSITIVE_STYLE_ANCHORS.map((anchor) => `- ${anchor}`).join("\n")}

Forbidden drift anchors:
${CHARACTER_INITIAL_CONCEPT_NEGATIVE_STYLE_ANCHORS.map((anchor) => `- ${anchor}`).join("\n")}

Shared lane quality floor:
- ${CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR}

Allowed lane variation:
- ${CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE}

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid plastic skin, superhero jawlines, and generic fashion-model polish.
`;
}

export function renderCharacterInitialConceptApiStyleInstructions(): string[] {
  return [
    renderTowerCharacterSharedStyleEnvelope(),
    renderTowerCharacterDesignVariationMatrix(),
    "Keep natural human imperfections and lived-in specificity; avoid plastic skin, superhero jawlines, and generic fashion-model polish.",
  ];
}

export function findForbiddenTowerCharacterConceptPromptTerms(prompt: string): string[] {
  return FORBIDDEN_PROMPT_PATTERNS
    .filter(({ pattern }) => pattern.test(prompt))
    .map(({ term }) => term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractTowerCharacterDesignCardField(
  prompt: string,
  field: (typeof TOWER_CHARACTER_CONCEPT_DESIGN_AXES)[number],
): string | undefined {
  const pattern = new RegExp(`(?:^|\\n)- ${escapeRegExp(field)}: ([^\\n]+)`, "i");

  return prompt.match(pattern)?.[1]?.trim();
}

export function evaluateTowerCharacterConceptPromptContract(input: {
  assetType: CreativeAssetType;
  phase: "initial-design" | "production-pack";
  slots: ReadonlyArray<{ slotId: string; prompt: string }>;
}): TowerCharacterConceptPromptQaReport {
  if (input.assetType !== "character" || input.phase !== "initial-design") {
    return {
      status: "passed",
      failures: [],
      repeatedFailureCodes: [],
    };
  }

  const failures: TowerCharacterConceptPromptQaFailure[] = [];
  const envelopePattern = new RegExp(
    `${escapeRegExp(TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_HEADER)}[\\s\\S]*?${escapeRegExp(TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_FOOTER)}`,
  );
  const envelopes = input.slots.map((slot) => ({
    slotId: slot.slotId,
    envelope: slot.prompt.match(envelopePattern)?.[0],
  }));
  const presentEnvelopes = envelopes
    .map(({ envelope }) => envelope)
    .filter((envelope): envelope is string => Boolean(envelope));

  for (const slot of input.slots) {
    const banned = findForbiddenTowerCharacterConceptPromptTerms(slot.prompt);

    if (banned.length) {
      failures.push({
        slotId: slot.slotId,
        code: "style-envelope-forbidden-term",
        message: `Prompt contains banned character concept wording: ${banned.join(", ")}`,
      });
    }

    if (!slot.prompt.includes(TOWER_CHARACTER_CONCEPT_STYLE_ENVELOPE_HEADER)) {
      failures.push({
        slotId: slot.slotId,
        code: "style-envelope-missing",
        message: "Prompt is missing the shared Tower character style envelope.",
      });
    }

    if (!slot.prompt.includes("Design variation matrix")) {
      failures.push({
        slotId: slot.slotId,
        code: "design-variation-matrix-missing",
        message: "Prompt is missing the character design variation matrix.",
      });
    }

    if (!slot.prompt.includes("Lane design card")) {
      failures.push({
        slotId: slot.slotId,
        code: "lane-design-card-missing",
        message: "Prompt is missing an explicit lane design card.",
      });
    }

    for (const axis of TOWER_CHARACTER_CONCEPT_DESIGN_AXES) {
      if (!extractTowerCharacterDesignCardField(slot.prompt, axis)) {
        failures.push({
          slotId: slot.slotId,
          code: `design-axis-missing:${axis}`,
          message: `Prompt is missing design axis: ${axis}.`,
        });
      }
    }
  }

  if (presentEnvelopes.length !== input.slots.length || new Set(presentEnvelopes).size !== 1) {
    failures.push({
      slotId: "concept-board",
      code: "style-envelope-not-shared",
      message: "Character concept lanes do not all share one identical style envelope.",
    });
  }

  const uniqueValuesForAxis = (axis: (typeof TOWER_CHARACTER_CONCEPT_DESIGN_AXES)[number]) =>
    new Set(input.slots.map((slot) =>
      extractTowerCharacterDesignCardField(slot.prompt, axis)?.toLowerCase() ?? "",
    ).filter(Boolean));
  const minimumDiversity = Math.min(4, input.slots.length);

  for (const axis of ["hair shape/length/texture", "wardrobe category", "Tower role archetype"] as const) {
    const uniqueValues = uniqueValuesForAxis(axis);
    const required = axis === "Tower role archetype" ? input.slots.length : minimumDiversity;

    if (uniqueValues.size < required) {
      failures.push({
        slotId: "concept-board",
        code: "design-diversity-collapse",
        message: `Character concept lanes are not meaningfully different on ${axis}.`,
      });
    }
  }

  const failureCounts = failures.reduce<Record<string, number>>((counts, failure) => {
    counts[failure.code] = (counts[failure.code] ?? 0) + 1;
    return counts;
  }, {});

  return {
    status: failures.length ? "failed" : "passed",
    failures,
    repeatedFailureCodes: Object.entries(failureCounts)
      .filter(([, count]) => count >= 2)
      .map(([code]) => code),
  };
}
