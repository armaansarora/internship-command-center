export interface Brief {
  phase: string;
  name: string;
  intent: string;
  anchors: string;
  proof: string;
  raw: string;
}

const BRIEFS_HEADER = /^##\s+§?7[^\n]*briefs/im;

function sliceBriefs(roadmap: string): string {
  const idx = roadmap.search(BRIEFS_HEADER);
  if (idx === -1) throw new Error("no 'Briefs' section found (## §7)");
  const rest = roadmap.slice(idx);
  const relativeNext = rest.slice(1).search(/^##\s+§?\d/m);
  return relativeNext === -1 ? rest : rest.slice(0, relativeNext + 1);
}

export function parseRoadmap(roadmap: string): Record<string, Brief> {
  const briefs = sliceBriefs(roadmap);
  const out: Record<string, Brief> = {};
  const re = /^###\s+(R\d+)\s*[—-]\s*(.+)$/gm;
  const matches: { phase: string; name: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(briefs)) !== null) {
    matches.push({ phase: m[1], name: m[2].trim(), start: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const { phase, name, start } = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].start : briefs.length;
    const raw = briefs.slice(start, end);
    out[phase] = {
      phase,
      name,
      intent: extractField(raw, "Intent") ?? "",
      anchors: extractField(raw, "Anchors") ?? "",
      proof: extractField(raw, "Proof") ?? "",
      raw,
    };
  }
  return out;
}

export function extractBrief(roadmap: string, phase: string): string {
  const briefs = parseRoadmap(roadmap);
  const b = briefs[phase];
  if (!b) throw new Error(`phase ${phase} not found in roadmap briefs`);
  return b.raw.trim();
}

export function listPhases(roadmap: string): string[] {
  return Object.keys(parseRoadmap(roadmap));
}

function extractField(block: string, field: string): string | null {
  const re = new RegExp(
    `\\*\\*${field}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|\\n###|$)`,
    "is",
  );
  const m = block.match(re);
  return m ? m[1].trim() : null;
}
