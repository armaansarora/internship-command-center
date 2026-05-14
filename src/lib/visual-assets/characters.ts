import type {
  CharacterFrame,
  CharacterId,
  CharacterMasterQuality,
  CharacterMotionProfile,
  CharacterSafePadding,
} from "./types";

interface CharacterRenderingMetadata {
  masterQuality: CharacterMasterQuality;
  sourceFrame: CharacterFrame;
  displayFrame: CharacterFrame;
  safePadding: CharacterSafePadding;
  maxDisplayScale: number;
  motionProfile: CharacterMotionProfile;
  artDirectionNotes: string;
}

export interface CharacterVisualMetadata {
  id: CharacterId;
  displayName: string;
  shortLabel: string;
  title: string;
  space: string;
  styleId: "tower-flat-plus-depth-v1";
  canonStatus: "bible-approved";
  assetStatus: "awaiting-concept-approval" | "concept-approved" | "model-approved" | "pose-pack-approved";
  promptRef: string;
  conceptBoardPromptRef: string;
  posePackPromptRef: string;
  accent: string;
  visualArchetype: string;
  silhouette: string;
  wardrobe: string;
  props: string;
  mobileRead: string;
  negativeDNA: string;
  masterQuality: CharacterMasterQuality;
  sourceFrame: CharacterFrame;
  displayFrame: CharacterFrame;
  safePadding: CharacterSafePadding;
  maxDisplayScale: number;
  motionProfile: CharacterMotionProfile;
  artDirectionNotes: string;
}

type CharacterBaseMetadata = Omit<CharacterVisualMetadata, keyof CharacterRenderingMetadata>;

const DEFAULT_SOURCE_FRAME: CharacterFrame = { width: 2341, height: 4096 };
const DEFAULT_DISPLAY_FRAME: CharacterFrame = { width: 160, height: 280 };
const DEFAULT_SAFE_PADDING: CharacterSafePadding = { top: 7, right: 10, bottom: 8, left: 10 };

const CHARACTER_RENDERING_METADATA: Record<CharacterId, CharacterRenderingMetadata> = {
  otis: {
    masterQuality: "4k-source-approved",
    sourceFrame: { width: 2400, height: 4096 },
    displayFrame: { width: 170, height: 290 },
    safePadding: { top: 7, right: 11, bottom: 8, left: 11 },
    maxDisplayScale: 3,
    motionProfile: "concierge-calm",
    artDirectionNotes: "Otis must stay soft, human, slightly rounded, and warmly readable at the Lobby desk.",
  },
  ceo: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "executive-still",
    artDirectionNotes: "Mara should feel controlled and architectural; her stillness is part of the authority.",
  },
  cro: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "war-room-kinetic",
    artDirectionNotes: "Rafe should read as restless pressure through lean, brows, sleeves, and red edit prop.",
  },
  cfo: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "analytical-precise",
    artDirectionNotes: "Priya should stay compact, exact, and humane, with the tablet-ledger read never overwhelming her face.",
  },
  coo: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "operations-brisk",
    artDirectionNotes: "Dylan should feel clipped and operational, not panicked; the watch or clipboard carries the rhythm.",
  },
  cmo: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "editorial-poised",
    artDirectionNotes: "Vera should move through expressive hands and poised edits, never artist-chaos costume language.",
  },
  cno: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "networking-warm",
    artDirectionNotes: "Sol should feel socially open and precise, with contact-card warmth instead of sales energy.",
  },
  cpo: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "prep-focused",
    artDirectionNotes: "Inez should feel rigorous and supportive, using teacherly focus without stern schoolroom caricature.",
  },
  cio: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "research-watchful",
    artDirectionNotes: "Mina should feel difficult to surprise, sharp and compact, with evidence props kept clean.",
  },
  trust: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "trust-still",
    artDirectionNotes: "Etta should feel protective through restraint: squared stance, tiny smile, and permission-stamp gravity.",
  },
  archivist: {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "archive-kinetic",
    artDirectionNotes: "Rowan should carry motion in an asymmetrical lean and tool-card energy, not fantasy archivist cues.",
  },
  "red-team": {
    masterQuality: "4k-source-approved",
    sourceFrame: DEFAULT_SOURCE_FRAME,
    displayFrame: DEFAULT_DISPLAY_FRAME,
    safePadding: DEFAULT_SAFE_PADDING,
    maxDisplayScale: 3,
    motionProfile: "red-team-controlled",
    artDirectionNotes: "Nadia should feel calm and consequential, angular without becoming villain-coded.",
  },
};

const SEASON_ONE_CHARACTER_BASE_METADATA = [
  {
    id: "otis",
    displayName: "Otis Vale",
    shortLabel: "OTIS",
    title: "Lobby Concierge",
    space: "lobby",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:otis-character-bible-v1",
    conceptBoardPromptRef: "art-bible:otis-concept-board-v1",
    posePackPromptRef: "art-bible:otis-pose-pack-v1",
    accent: "#6B2A2E",
    visualArchetype: "Warm front-desk steward with old-building composure.",
    silhouette: "Tall calm vertical read with grounded hands and soft shoulders.",
    wardrobe: "Burgundy livery or vest-cardigan hybrid with brass detail.",
    props: "Brass bell, keycard ring, guest ledger.",
    mobileRead: "Burgundy torso, brass detail, centered concierge posture.",
    negativeDNA: "No mascot concierge, bowtie caricature, CEO gold palette, or stock hotel smile.",
  },
  {
    id: "ceo",
    displayName: "Mara Voss",
    shortLabel: "CEO",
    title: "Chief Executive Officer",
    space: "penthouse",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:mara-voss-character-bible-v1",
    conceptBoardPromptRef: "art-bible:mara-voss-concept-board-v1",
    posePackPromptRef: "art-bible:mara-voss-pose-pack-v1",
    accent: "#C9A84C",
    visualArchetype: "Commanding crisis strategist with still executive gravity.",
    silhouette: "Architectural tailoring, upright stillness, sharp shoulder geometry.",
    wardrobe: "Immaculate dark suit with controlled ivory or oxblood accent.",
    props: "Severe gold detail, briefing folder, skyline glass posture.",
    mobileRead: "Dark angular silhouette with one controlled gold accent.",
    negativeDNA: "No celebrity likeness, villain queen, flashy jewelry overload, or startup blazer softness.",
  },
  {
    id: "cro",
    displayName: "Rafe Calder",
    shortLabel: "CRO",
    title: "Chief Revenue Officer",
    space: "war-room",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:rafe-calder-character-bible-v1",
    conceptBoardPromptRef: "art-bible:rafe-calder-concept-board-v1",
    posePackPromptRef: "art-bible:rafe-calder-pose-pack-v1",
    accent: "#2D7DD2",
    visualArchetype: "Competitive application demolition expert with restless pressure.",
    silhouette: "Forward lean, athletic tension, expressive brows, active hands.",
    wardrobe: "Rolled sleeves, loosened tie or tactical jacket, loud shoes.",
    props: "Red pen, stylus, pipeline board marker.",
    mobileRead: "Forward lean plus red edit prop reads even at small size.",
    negativeDNA: "No finance-bro stock pose, superhero stance, luxury flex, or generic salesman grin.",
  },
  {
    id: "cfo",
    displayName: "Priya Sen",
    shortLabel: "CFO",
    title: "Chief Financial Officer",
    space: "observatory",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:priya-sen-character-bible-v1",
    conceptBoardPromptRef: "art-bible:priya-sen-concept-board-v1",
    posePackPromptRef: "art-bible:priya-sen-pose-pack-v1",
    accent: "#64B4FF",
    visualArchetype: "Precise portfolio analyst with visible conscience.",
    silhouette: "Compact, composed, mathematical stillness with practical posture.",
    wardrobe: "Tailored functional layers in cool Observatory tones.",
    props: "Tablet ledger, annotated chart card, precise stylus.",
    mobileRead: "Cool compact shape plus tablet-ledger prop.",
    negativeDNA: "No robot accountant, banker stock suit, abacus gimmick, or chart clutter baked into sprite.",
  },
  {
    id: "coo",
    displayName: "Dylan Shorts",
    shortLabel: "COO",
    title: "Chief Operating Officer",
    space: "situation-room",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:dylan-shorts-character-bible-v1",
    conceptBoardPromptRef: "art-bible:dylan-shorts-concept-board-v1",
    posePackPromptRef: "art-bible:dylan-shorts-pose-pack-v1",
    accent: "#DC7C28",
    visualArchetype: "Calendar tyrant with chief-of-staff urgency.",
    silhouette: "Boxy confident stance, clipped gestures, watch-check rhythm.",
    wardrobe: "Utility blazer, crisp layers, operations-ready shoes.",
    props: "Tablet, clipboard, calendar card, timer.",
    mobileRead: "Orange ops accent with clipboard/watch gesture.",
    negativeDNA: "No bland project manager stock art, panic sweat, military costume, or intern styling.",
  },
  {
    id: "cmo",
    displayName: "Vera Bloom",
    shortLabel: "CMO",
    title: "Chief Marketing Officer",
    space: "writing-room",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:vera-bloom-character-bible-v1",
    conceptBoardPromptRef: "art-bible:vera-bloom-concept-board-v1",
    posePackPromptRef: "art-bible:vera-bloom-pose-pack-v1",
    accent: "#E8A020",
    visualArchetype: "Elegant narrative strategist with editorial precision.",
    silhouette: "Expressive hands, poised torso, controlled creative asymmetry.",
    wardrobe: "Editorial layers with intentional warm accent and polished restraint.",
    props: "Red pencil, paper stack, fountain pen, margin notes.",
    mobileRead: "Warm writing-room accent and red pencil read first.",
    negativeDNA: "No beret stereotype, chaotic artist costume, glamour pose, or fake text pages.",
  },
  {
    id: "cno",
    displayName: "Sol Navarro",
    shortLabel: "CNO",
    title: "Chief Networking Officer",
    space: "rolodex-lounge",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:sol-navarro-character-bible-v1",
    conceptBoardPromptRef: "art-bible:sol-navarro-concept-board-v1",
    posePackPromptRef: "art-bible:sol-navarro-pose-pack-v1",
    accent: "#5DAA78",
    visualArchetype: "Warm relationship strategist with socially precise ease.",
    silhouette: "Open shoulders, relaxed lounge posture, approachable polish.",
    wardrobe: "Soft tailored jacket, brass-green accents, lived-in refinement.",
    props: "Contact cards, phone, coffee note, intro card.",
    mobileRead: "Open stance plus contact-card prop and green accent.",
    negativeDNA: "No manipulative grin, spammy sales posture, party promoter outfit, or heart motif.",
  },
  {
    id: "cpo",
    displayName: "Dr. Inez Park",
    shortLabel: "CPO",
    title: "Chief Preparation Officer",
    space: "briefing-room",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:inez-park-character-bible-v1",
    conceptBoardPromptRef: "art-bible:inez-park-concept-board-v1",
    posePackPromptRef: "art-bible:inez-park-pose-pack-v1",
    accent: "#4A9EDB",
    visualArchetype: "Behavioral scientist of ambition with rigorous care.",
    silhouette: "Precise stance, focused eyebrow, clean teaching posture.",
    wardrobe: "Structured coat, soft sneakers, prep-lab layers.",
    props: "Dossier, timer, whiteboard marker, laser pointer.",
    mobileRead: "Blue prep-lab accent with dossier/timer prop.",
    negativeDNA: "No lab-coat caricature, stern schoolteacher, medical costume, or therapy couch cue.",
  },
  {
    id: "cio",
    displayName: "Mina Rook",
    shortLabel: "CIO",
    title: "Chief Intelligence Officer",
    space: "research",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:mina-rook-character-bible-v1",
    conceptBoardPromptRef: "art-bible:mina-rook-concept-board-v1",
    posePackPromptRef: "art-bible:mina-rook-pose-pack-v1",
    accent: "#7C6CE6",
    visualArchetype: "Nocturnal pattern hunter with evidence-first restraint.",
    silhouette: "Sharp compact posture, watchful side-eye, contained energy.",
    wardrobe: "Dark utility layers with one bright warning accent.",
    props: "Source cards, glasses reflection, dossier tab, research tablet.",
    mobileRead: "Purple research glow plus glasses/source-card shape.",
    negativeDNA: "No hacker hoodie, spy trench coat, cyberpunk visor, or conspiracy-wall chaos.",
  },
  {
    id: "trust",
    displayName: "Etta Knox",
    shortLabel: "TRUST",
    title: "Chief Trust Officer",
    space: "vault",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:etta-knox-character-bible-v1",
    conceptBoardPromptRef: "art-bible:etta-knox-concept-board-v1",
    posePackPromptRef: "art-bible:etta-knox-pose-pack-v1",
    accent: "#9E3F4F",
    visualArchetype: "Governance authority whose strictness is protective care.",
    silhouette: "Squared stance, tiny smile, composed veto posture.",
    wardrobe: "Tailored graphite and cream with oxblood trust accent.",
    props: "Permission stamp, clipped tablet, redline card, audit seal.",
    mobileRead: "Squared graphite shape plus oxblood stamp accent.",
    negativeDNA: "No police uniform, villain bureaucrat, courtroom cosplay, or cute lock mascot.",
  },
  {
    id: "archivist",
    displayName: "Rowan Vale",
    shortLabel: "ARCH",
    title: "Archivist",
    space: "archive",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:rowan-vale-character-bible-v1",
    conceptBoardPromptRef: "art-bible:rowan-vale-concept-board-v1",
    posePackPromptRef: "art-bible:rowan-vale-pose-pack-v1",
    accent: "#6E8F5E",
    visualArchetype: "Restless memory keeper with archive-and-elevator access.",
    silhouette: "Asymmetrical lean, half-turned posture, kinetic hands.",
    wardrobe: "Structured coat or cardigan, rolled sleeves, brass rail detail.",
    props: "Pencil, tablet, tool ring, index card, elevator keycard.",
    mobileRead: "Asymmetrical archive lean with green index-card accent.",
    negativeDNA: "No dusty wizard archivist, sepia nostalgia, inventor goggles, or magical librarian costume.",
  },
  {
    id: "red-team",
    displayName: "Nadia Flint",
    shortLabel: "RED",
    title: "Red Team Counsel",
    space: "red-team-review",
    styleId: "tower-flat-plus-depth-v1",
    canonStatus: "bible-approved",
    assetStatus: "awaiting-concept-approval",
    promptRef: "art-bible:nadia-flint-character-bible-v1",
    conceptBoardPromptRef: "art-bible:nadia-flint-concept-board-v1",
    posePackPromptRef: "art-bible:nadia-flint-pose-pack-v1",
    accent: "#A3343F",
    visualArchetype: "Hostile-read counsel whose adversarial instinct is care.",
    silhouette: "Sharp angular posture, composed profile, expressive eyebrow.",
    wardrobe: "Black, oxblood, and white legal-review layers.",
    props: "Closed folder, verdict card, legal pad, redline tab.",
    mobileRead: "Oxblood angular silhouette plus verdict-card prop.",
    negativeDNA: "No villain lawyer, detective trench coat, courtroom costume, horror lighting, or fake legal text.",
  },
] as const satisfies readonly CharacterBaseMetadata[];

export const SEASON_ONE_CHARACTER_METADATA = SEASON_ONE_CHARACTER_BASE_METADATA.map(
  (character) => ({
    ...character,
    ...CHARACTER_RENDERING_METADATA[character.id],
  }),
) as readonly CharacterVisualMetadata[];

export const CHARACTER_VISUAL_METADATA = Object.fromEntries(
  SEASON_ONE_CHARACTER_METADATA.map((character) => [character.id, character]),
) as Record<CharacterId, CharacterVisualMetadata>;

export function getCharacterVisualMetadata(id: CharacterId): CharacterVisualMetadata {
  return CHARACTER_VISUAL_METADATA[id];
}
