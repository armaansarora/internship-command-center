import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryCanonListInputSchema,
  FoundryCanonListOutputSchema,
  type FoundryCanonListInput,
  type FoundryCanonListOutput,
  type FoundryCanonKind,
} from "../tools";

export interface FoundryCanonListContext {
  /** Root directory containing per-kind subdirectories of YAML canon files. */
  canonRoot: string;
}

const KIND_DIRS: Record<FoundryCanonKind, string> = {
  character: "characters",
  floor: "floors",
  palette: "palettes",
  "style-envelope": "style-envelopes",
};

function listYamlFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
}

function parseHeader(text: string): {
  id?: string;
  displayName?: string;
  summary?: string;
} {
  const out: { id?: string; displayName?: string; summary?: string } = {};
  for (const line of text.split("\n").slice(0, 20)) {
    const idMatch = /^id:\s*(.+)$/.exec(line);
    if (idMatch) out.id = idMatch[1]?.trim();
    const dnMatch = /^displayName:\s*(.+)$/.exec(line);
    if (dnMatch) out.displayName = dnMatch[1]?.trim();
    const sumMatch = /^summary:\s*(.+)$/.exec(line);
    if (sumMatch) out.summary = sumMatch[1]?.trim();
  }
  return out;
}

export async function handleFoundryCanonList(
  rawInput: unknown,
  ctx: FoundryCanonListContext,
): Promise<FoundryCanonListOutput> {
  const input: FoundryCanonListInput = FoundryCanonListInputSchema.parse(rawInput);
  const kinds = input.kind
    ? ([input.kind] as FoundryCanonKind[])
    : (Object.keys(KIND_DIRS) as FoundryCanonKind[]);

  const entries: FoundryCanonListOutput["entries"] = [];
  for (const kind of kinds) {
    const dir = join(ctx.canonRoot, KIND_DIRS[kind]);
    for (const file of listYamlFilesIn(dir)) {
      const text = readFileSync(join(dir, file), "utf8");
      const header = parseHeader(text);
      if (!header.id || !header.displayName) continue;
      entries.push({
        id: header.id,
        kind,
        displayName: header.displayName,
        summary: header.summary ?? "",
      });
    }
  }

  return FoundryCanonListOutputSchema.parse({ entries });
}
