import fs from "fs-extra";
import path from "node:path";

export interface HandoffInput {
  sessionId: string;
  phase: string;
  started: string;
  ended: string;
  contextUsedPct: number;
  shipped: { task: string; commit: string }[];
  inProgress: string;
  next: string[];
  decisions: { text: string; why?: string }[];
  surprises: string[];
  filesInPlay: string[];
  blockers: { id: string; task: string; text: string }[];
  contextNotes: string;
  commits: string[];
  tasksCompleted: string[];
  tasksStarted: string[];
  blockersOpened: string[];
}

export function renderHandoff(h: HandoffInput): string {
  const parts: string[] = [];
  parts.push("---");
  parts.push(`session_id: ${h.sessionId}`);
  parts.push(`started: ${h.started}`);
  parts.push(`ended: ${h.ended}`);
  parts.push(`phase: ${h.phase}`);
  parts.push(`context_used_pct: ${h.contextUsedPct}`);
  parts.push(`commits: [${h.commits.join(", ")}]`);
  parts.push(`tasks_completed: [${h.tasksCompleted.join(", ")}]`);
  parts.push(`tasks_started: [${h.tasksStarted.join(", ")}]`);
  parts.push(`blockers_opened: [${h.blockersOpened.join(", ")}]`);
  parts.push("---");
  parts.push("");

  if (h.shipped.length) {
    parts.push("## Shipped");
    for (const s of h.shipped) parts.push(`- ${s.task} — commit \`${s.commit}\``);
    parts.push("");
  }
  if (h.inProgress) {
    parts.push("## In progress");
    parts.push(h.inProgress);
    parts.push("");
  }
  if (h.next.length) {
    parts.push("## Next");
    h.next.forEach((n, i) => parts.push(`${i + 1}. ${n}`));
    parts.push("");
  }
  if (h.decisions.length) {
    parts.push("## Decisions this session");
    for (const d of h.decisions)
      parts.push(d.why ? `- ${d.text} — *${d.why}*` : `- ${d.text}`);
    parts.push("");
  }
  if (h.surprises.length) {
    parts.push("## Surprises / gotchas");
    for (const s of h.surprises) parts.push(`- ${s}`);
    parts.push("");
  }
  if (h.filesInPlay.length) {
    parts.push("## Files in play");
    for (const f of h.filesInPlay) parts.push(`- \`${f}\``);
    parts.push("");
  }
  if (h.blockers.length) {
    parts.push("## Blockers");
    for (const b of h.blockers)
      parts.push(`- **${b.id}** ${b.task} — ${b.text}`);
    parts.push("");
  }
  if (h.contextNotes) {
    parts.push("## Context notes");
    parts.push(h.contextNotes);
    parts.push("");
  }
  return parts.join("\n");
}

function filenameFor(ended: string): string {
  const d = new Date(ended);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}${min}.md`;
}

export async function writeHandoff(
  repo: string,
  h: HandoffInput,
): Promise<string> {
  const dir = path.join(repo, ".handoff");
  await fs.ensureDir(dir);
  const p = path.join(dir, filenameFor(h.ended));
  await fs.writeFile(p, renderHandoff(h), "utf-8");
  return p;
}

export async function findLatestHandoff(
  repo: string,
): Promise<string | null> {
  const dir = path.join(repo, ".handoff");
  if (!(await fs.pathExists(dir))) return null;
  const files = (await fs.readdir(dir))
    .filter((f) => f.endsWith(".md"))
    .sort();
  if (files.length === 0) return null;
  return path.join(dir, files[files.length - 1]);
}
