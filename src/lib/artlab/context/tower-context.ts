// src/lib/artlab/context/tower-context.ts
//
// The Tower context bundle — a single in-memory snapshot of every piece of
// Tower-canon knowledge the LLM brain + prompt builder need to generate
// real Tower-appropriate art. Loaded once per daemon process, cached in
// `cachedBundle` until daemon restart or `reload: true`.
//
// Sources:
//   docs/ART-BIBLE.md                  — visual north star + style rules + negative-prompt rules
//   docs/CHARACTER-BIBLE.md            — per-character canon (wound/doctrine/flaw/silhouette/etc.)
//   docs/CHARACTER-IMAGE-PROMPTS.md    — generation-ready prompts per character
//   docs/VISION-SPEC.md                — spatial UI metaphor + floor directory
//   src/lib/visual-assets/characters.ts — SEASON_ONE_CHARACTER_METADATA (silhouette, wardrobe, props…)
//   .artlab/engine/memory/*.jsonl       — style-wins, rejections, prompt-evolution
//
// The bundle is deliberately filesystem-derived (no DB, no network). Restart
// the daemon to pick up doc edits.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SEASON_ONE_CHARACTER_METADATA } from "@/lib/visual-assets/characters";
import { getRelevantMemory } from "@/lib/artlab/memory/retrieve";
import type { StyleWinEntry } from "@/lib/artlab/memory/style-ledger";
import type { RejectionEntry } from "@/lib/artlab/memory/rejection-ledger";

// ---------- types ----------

export interface TowerStyleEnvelope {
  id: "tower-flat-plus-depth-v1";
  storyTone: "Professional Scars";
  visualNorthStar: string;
  styleRules: string;
  negativePromptRules: string;
}

export interface TowerCharacterContext {
  characterId: string;
  displayName: string;
  firstName: string;
  shortLabel: string;
  title: string;
  space: string;
  accent: string;
  // From SEASON_ONE_CHARACTER_METADATA
  visualArchetype: string;
  silhouette: string;
  wardrobe: string;
  props: string;
  mobileRead: string;
  negativeDNA: string;
  artDirectionNotes: string;
  // From CHARACTER-IMAGE-PROMPTS.md
  conceptBoardPrompt: string;
  posePackPromptTemplate: string;
  negativePrompt: string;
  // From CHARACTER-BIBLE.md (### sections)
  wound: string;
  doctrine: string;
  flaw: string;
  secretStrength: string;
  comedicEngine: string;
  visualDNA: string;
  forbiddenVisualTraits: string;
  promptFragments: string;
  // From memory ledgers (top 5 by recency)
  recentStyleWins: StyleWinEntry[];
  recentRejections: RejectionEntry[];
  promotedAssetCount: number;
}

export interface TowerFloorContext {
  space: string;          // "rolodex-lounge"
  floorNumber: string;    // "6F" | "PH" | "L"
  roomName: string;       // "The Rolodex Lounge"
  function: string;       // "Contacts/Networking"
  atmosphere: string;     // "Warm networking lounge…"
  characterIds: string[]; // characters that live on this floor
  route: string;          // "/rolodex-lounge"
  liveUrl: string;        // "https://www.interntower.com/rolodex-lounge"
}

export interface TowerVisionSpec {
  coreMetaphor: string;
  floorDirectory: string;
}

export interface TowerProtectedAssets {
  lobbyBackgrounds: readonly string[];
  byteProtectedCharacters: readonly string[];
}

export interface TowerContextBundle {
  loadedAt: string;
  styleEnvelope: TowerStyleEnvelope;
  characters: Record<string, TowerCharacterContext>;
  floors: Record<string, TowerFloorContext>;
  visionSpec: TowerVisionSpec;
  protectedAssets: TowerProtectedAssets;
}

// ---------- public API ----------

const TOWER_LIVE_BASE_URL = "https://www.interntower.com";
const LOCAL_PROJECT_ROOT_GUESS = "/Users/armaanarora/Documents/The Tower";

let cachedBundle: TowerContextBundle | null = null;

export interface LoadTowerContextOpts {
  workspaceRoot: string;
  projectRoot?: string;
  reload?: boolean;
}

export async function loadTowerContext(opts: LoadTowerContextOpts): Promise<TowerContextBundle> {
  if (!opts.reload && cachedBundle) return cachedBundle;

  const projectRoot = opts.projectRoot ?? resolveProjectRootFromWorkspace(opts.workspaceRoot);
  const styleEnvelope = parseStyleEnvelope(readDoc(projectRoot, "docs/ART-BIBLE.md"));
  const imagePrompts = parseImagePrompts(readDoc(projectRoot, "docs/CHARACTER-IMAGE-PROMPTS.md"));
  const bibleSections = parseBibleSections(readDoc(projectRoot, "docs/CHARACTER-BIBLE.md"));
  const visionSpec = parseVisionSpec(readDoc(projectRoot, "docs/VISION-SPEC.md"));
  const floors = buildFloorIndex(visionSpec.floorDirectory);

  const memoryDir = join(opts.workspaceRoot, "memory");
  const characters: Record<string, TowerCharacterContext> = {};
  for (const meta of SEASON_ONE_CHARACTER_METADATA) {
    const imagePrompt = imagePrompts[meta.id] ?? null;
    const bible = bibleSections[meta.id] ?? null;
    const memory = existsSync(memoryDir)
      ? await getRelevantMemory({ memoryDir, assetType: "character", characterId: meta.id, topN: 5 })
      : { wins: [], rejections: [], recentPromptHardening: [] };
    const tokens = deriveFirstShort(meta.displayName, meta.shortLabel);
    characters[meta.id] = {
      characterId: meta.id,
      displayName: meta.displayName,
      firstName: tokens.firstName,
      shortLabel: meta.shortLabel,
      title: meta.title,
      space: meta.space,
      accent: meta.accent,
      visualArchetype: meta.visualArchetype,
      silhouette: meta.silhouette,
      wardrobe: meta.wardrobe,
      props: meta.props,
      mobileRead: meta.mobileRead,
      negativeDNA: meta.negativeDNA,
      artDirectionNotes: meta.artDirectionNotes,
      conceptBoardPrompt: imagePrompt?.conceptBoardPrompt ?? "",
      posePackPromptTemplate: imagePrompt?.posePackPrompt ?? "",
      negativePrompt: imagePrompt?.negativePrompt ?? "",
      wound: bible?.wound ?? "",
      doctrine: bible?.doctrine ?? "",
      flaw: bible?.flaw ?? "",
      secretStrength: bible?.secretStrength ?? "",
      comedicEngine: bible?.comedicEngine ?? "",
      visualDNA: bible?.visualDNA ?? "",
      forbiddenVisualTraits: bible?.forbiddenVisualTraits ?? "",
      promptFragments: bible?.promptFragments ?? "",
      recentStyleWins: memory.wins,
      recentRejections: memory.rejections,
      promotedAssetCount: memory.wins.length,
    };

    // Attach character to its floor
    const floorKey = meta.space;
    if (floors[floorKey]) floors[floorKey]!.characterIds.push(meta.id);
  }

  const bundle: TowerContextBundle = {
    loadedAt: new Date().toISOString(),
    styleEnvelope,
    characters,
    floors,
    visionSpec,
    protectedAssets: {
      lobbyBackgrounds: [
        "public/lobby/bg-1.jpg",
        "public/lobby/bg-2.jpg",
        "public/lobby/bg-3.jpg",
        "public/lobby/bg-4.jpg",
      ],
      byteProtectedCharacters: ["otis", "ceo"],
    },
  };

  cachedBundle = bundle;
  return bundle;
}

export function pickCharacterContext(
  bundle: TowerContextBundle,
  characterId: string | undefined,
): TowerCharacterContext | null {
  if (!characterId) return null;
  return bundle.characters[characterId] ?? null;
}

export function pickFloorContext(
  bundle: TowerContextBundle,
  space: string | undefined,
): TowerFloorContext | null {
  if (!space) return null;
  return bundle.floors[space] ?? null;
}

export function resetTowerContextCache(): void {
  cachedBundle = null;
}

// ---------- internals ----------

function resolveProjectRootFromWorkspace(workspaceRoot: string): string {
  // workspaceRoot is typically <project>/.artlab/engine; project root is two levels up.
  const ws = workspaceRoot;
  if (ws.endsWith("/.artlab/engine") || ws.endsWith("/.artlab/engine/")) {
    return ws.replace(/\/\.artlab\/engine\/?$/, "");
  }
  if (existsSync(join(ws, "docs", "ART-BIBLE.md"))) return ws;
  return LOCAL_PROJECT_ROOT_GUESS;
}

function readDoc(projectRoot: string, relativePath: string): string {
  const path = join(projectRoot, relativePath);
  if (!existsSync(path)) return "";
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

function deriveFirstShort(displayName: string, shortLabel: string): { firstName: string } {
  const tokens = displayName.split(/\s+/).filter(Boolean);
  const honorifics = new Set(["Dr", "Dr."]);
  const startIndex = tokens.findIndex((t) => !honorifics.has(t));
  return { firstName: tokens[startIndex === -1 ? 0 : startIndex] ?? shortLabel };
}

// Section extractor: returns the substring of `markdown` from `## <heading>` to the
// next `## ` (or EOF). `heading` matches case-insensitively, trimmed.
function extractH2Section(markdown: string, heading: string): string {
  const target = heading.trim().toLowerCase();
  const lines = markdown.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.startsWith("## ") && line.slice(3).trim().toLowerCase() === target) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i]!.startsWith("## ")) { end = i; break; }
  }
  return lines.slice(start, end).join("\n").trim();
}

function parseStyleEnvelope(artBibleMarkdown: string): TowerStyleEnvelope {
  return {
    id: "tower-flat-plus-depth-v1",
    storyTone: "Professional Scars",
    visualNorthStar: extractH2Section(artBibleMarkdown, "Visual North Star"),
    styleRules: extractH2Section(artBibleMarkdown, "Style Rules"),
    negativePromptRules: extractH2Section(artBibleMarkdown, "Negative Prompt Rules"),
  };
}

interface ParsedImagePromptSection {
  characterId: string;
  conceptBoardPrompt: string;
  posePackPrompt: string;
  negativePrompt: string;
}

function parseImagePrompts(markdown: string): Record<string, ParsedImagePromptSection> {
  const out: Record<string, ParsedImagePromptSection> = {};
  if (!markdown) return out;
  // CHARACTER-IMAGE-PROMPTS.md uses `## <Name>` per character.
  const lines = markdown.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("## ") && !line.toLowerCase().includes("global prompt rules")) {
      // section start
      let j = i + 1;
      let characterId = "";
      let conceptBoardPrompt = "";
      let posePackPrompt = "";
      let negativePrompt = "";
      while (j < lines.length && !lines[j]!.startsWith("## ")) {
        const ln = lines[j]!;
        const idMatch = ln.match(/^characterId:\s*(.+?)\s*$/i);
        if (idMatch) characterId = idMatch[1]!;
        const cbpMatch = ln.match(/^Concept board prompt:\s*(.+)$/i);
        if (cbpMatch) conceptBoardPrompt = cbpMatch[1]!.trim();
        const ppMatch = ln.match(/^Pose pack prompt:\s*(.+)$/i);
        if (ppMatch) posePackPrompt = ppMatch[1]!.trim();
        const npMatch = ln.match(/^Negative prompt:\s*(.+)$/i);
        if (npMatch) negativePrompt = npMatch[1]!.trim();
        j += 1;
      }
      if (characterId) {
        out[characterId] = { characterId, conceptBoardPrompt, posePackPrompt, negativePrompt };
      }
      i = j;
    } else {
      i += 1;
    }
  }
  return out;
}

interface ParsedBibleSection {
  characterId: string;
  wound: string;
  doctrine: string;
  flaw: string;
  secretStrength: string;
  comedicEngine: string;
  visualDNA: string;
  forbiddenVisualTraits: string;
  promptFragments: string;
}

function parseBibleSections(markdown: string): Record<string, ParsedBibleSection> {
  const out: Record<string, ParsedBibleSection> = {};
  if (!markdown) return out;
  // CHARACTER-BIBLE.md uses `### <Name>` per character inside `## Season 1 Cast`.
  const lines = markdown.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("### ")) {
      let j = i + 1;
      let characterId = "";
      const fields: Record<string, string> = {};
      while (j < lines.length && !lines[j]!.startsWith("## ") && !lines[j]!.startsWith("### ")) {
        const ln = lines[j]!;
        const idMatch = ln.match(/^characterId:\s*(.+?)\s*$/i);
        if (idMatch) characterId = idMatch[1]!;
        const lineMatch = ln.match(/^([A-Za-z][\w \-/]*?):\s*(.+)$/);
        if (lineMatch) {
          const key = lineMatch[1]!.trim().toLowerCase();
          fields[key] = lineMatch[2]!.trim();
        }
        j += 1;
      }
      if (characterId) {
        out[characterId] = {
          characterId,
          wound: fields["defining wound"] ?? "",
          doctrine: fields["role doctrine"] ?? "",
          flaw: fields["flaw"] ?? "",
          secretStrength: fields["secret strength"] ?? "",
          comedicEngine: fields["comedic engine"] ?? "",
          visualDNA: fields["visual dna"] ?? "",
          forbiddenVisualTraits: fields["forbidden visual traits"] ?? "",
          promptFragments: fields["prompt fragments"] ?? "",
        };
      }
      i = j;
    } else {
      i += 1;
    }
  }
  return out;
}

function parseVisionSpec(markdown: string): TowerVisionSpec {
  return {
    coreMetaphor: extractH2Section(markdown, "Core Philosophy"),
    floorDirectory: extractH2Section(markdown, "Floor Directory"),
  };
}

// Map of known character.space → app route slug. Routes confirmed via
// src/app/(authenticated)/<slug>/page.tsx existence.
const SPACE_TO_ROUTE: Record<string, string> = {
  lobby: "/lobby",
  penthouse: "/penthouse",
  "war-room": "/war-room",
  "rolodex-lounge": "/rolodex-lounge",
  "writing-room": "/writing-room",
  "situation-room": "/situation-room",
  "briefing-room": "/briefing-room",
  observatory: "/observatory",
  "c-suite": "/c-suite",
  parlor: "/parlor",
};

const FLOOR_BY_SPACE: Record<string, { floorNumber: string; roomName: string; function: string; atmosphere: string }> = {
  penthouse: { floorNumber: "PH", roomName: "The Penthouse", function: "Dashboard / overview", atmosphere: "NYC skyline · Central Park · golden hour · most luxurious" },
  "c-suite": { floorNumber: "1F", roomName: "The C-Suite", function: "Agent hub / CEO office", atmosphere: "Executive boardroom · most impressive room" },
  observatory: { floorNumber: "2F", roomName: "The Observatory", function: "Analytics", atmosphere: "Panoramic · cool blue · analytical · wide view" },
  "briefing-room": { floorNumber: "3F", roomName: "The Briefing Room", function: "Interview prep", atmosphere: "Clean · sharp · preparation space · whiteboards" },
  "situation-room": { floorNumber: "4F", roomName: "The Situation Room", function: "Follow-ups / calendar", atmosphere: "Alert · time-sensitive · mission-control energy" },
  "writing-room": { floorNumber: "5F", roomName: "The Writing Room", function: "Cover letters", atmosphere: "Quiet · library-like · focused creative" },
  "rolodex-lounge": { floorNumber: "6F", roomName: "The Rolodex Lounge", function: "Contacts / networking", atmosphere: "Warm networking lounge · relaxed but professional" },
  "war-room": { floorNumber: "7F", roomName: "The War Room", function: "Applications / pipeline", atmosphere: "Dark tactical · focused · data-dense war table" },
  lobby: { floorNumber: "L", roomName: "The Lobby", function: "Login / onboarding", atmosphere: "Polished reception · construction mode for new users" },
  parlor: { floorNumber: "P", roomName: "The Parlor", function: "Settings / parlor", atmosphere: "Private side room" },
};

function buildFloorIndex(_floorDirectoryMarkdown: string): Record<string, TowerFloorContext> {
  // We trust the static FLOOR_BY_SPACE map (derived from VISION-SPEC.md). The
  // raw markdown is kept in TowerVisionSpec.floorDirectory for brain prompts.
  const out: Record<string, TowerFloorContext> = {};
  for (const [space, info] of Object.entries(FLOOR_BY_SPACE)) {
    const route = SPACE_TO_ROUTE[space] ?? `/${space}`;
    out[space] = {
      space,
      floorNumber: info.floorNumber,
      roomName: info.roomName,
      function: info.function,
      atmosphere: info.atmosphere,
      characterIds: [],
      route,
      liveUrl: `${TOWER_LIVE_BASE_URL}${route}`,
    };
  }
  return out;
}
