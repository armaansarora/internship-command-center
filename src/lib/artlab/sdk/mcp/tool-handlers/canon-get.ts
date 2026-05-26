import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ArtLabCanonGetInputSchema,
  ArtLabCanonGetOutputSchema,
  type ArtLabCanonGetOutput,
  type ArtLabCanonKind,
} from "../tools";
import type { ArtLabCanonListContext } from "./canon-list";

const KIND_DIRS: Record<ArtLabCanonKind, string> = {
  character: "characters",
  floor: "floors",
  palette: "palettes",
  "style-envelope": "style-envelopes",
};

/**
 * Minimal YAML loader — we accept only the flat-and-nested-object
 * subset used by canon files. Pulling a full YAML lib in for this
 * one purpose isn't worth the dep weight; canon authors stick to
 * key: value and key: \n  sub: value forms.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = text.split("\n");
  let cursor: Record<string, unknown> = out;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.length - raw.replace(/^\s+/, "").length;
    const trimmed = raw.trim();
    const sepIdx = trimmed.indexOf(":");
    if (sepIdx < 0) continue;
    const key = trimmed.slice(0, sepIdx).trim();
    const value = trimmed.slice(sepIdx + 1).trim();
    if (indent === 0) {
      if (value === "") {
        const child: Record<string, unknown> = {};
        out[key] = child;
        cursor = child;
      } else {
        out[key] = value;
        cursor = out;
      }
    } else {
      cursor[key] = value;
    }
  }
  return out;
}

function locate(
  canonRoot: string,
  id: string,
): { kind: ArtLabCanonKind; path: string } | null {
  for (const kind of Object.keys(KIND_DIRS) as ArtLabCanonKind[]) {
    const dir = join(canonRoot, KIND_DIRS[kind]);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
      const path = join(dir, file);
      const head = readFileSync(path, "utf8").split("\n", 5).join("\n");
      const m = /^id:\s*(.+)$/m.exec(head);
      if (m?.[1]?.trim() === id) return { kind, path };
    }
  }
  return null;
}

export async function handleArtLabCanonGet(
  rawInput: unknown,
  ctx: ArtLabCanonListContext,
): Promise<ArtLabCanonGetOutput> {
  const input = ArtLabCanonGetInputSchema.parse(rawInput);
  const located = locate(ctx.canonRoot, input.id);
  if (!located) {
    throw new Error(`canon entry not found: ${input.id}`);
  }
  const text = readFileSync(located.path, "utf8");
  const yamlAsJson = parseSimpleYaml(text);
  return ArtLabCanonGetOutputSchema.parse({
    id: input.id,
    kind: located.kind,
    yamlAsJson,
    sourcePath: located.path,
  });
}
