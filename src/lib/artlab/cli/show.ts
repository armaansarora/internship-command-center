// src/lib/artlab/cli/show.ts
//
// `artlab show <runId>` renders a run's concept-board.json into a single
// HTML grid viewer so operators can compare the 5 concept-gen lanes
// side-by-side and pick which to approve. Today they have to open 5 PNGs
// one at a time; this collapses that to one local file.
//
// Pure render fn (`renderConceptBoardHtml`) is what HTML-shape tests assert
// against. The CLI (`runShowSubcommand`) orchestrates: validate args,
// read JSON, render, write, optionally open. The `spawnOpen` injection
// keeps tests off the real `open` binary.
//
// The HTML is intentionally self-contained: minimal inline CSS, no JS,
// no CDNs. Images are referenced by absolute path (which works in
// browsers when the HTML lives on the same filesystem).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

export interface ShowSubcommandInput {
  workspaceRoot: string;
  args: string[];
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  /** Test seam — defaults to spawning macOS `open` on darwin. */
  spawnOpen?: (htmlPath: string) => void;
}

export interface ShowSubcommandResult {
  exitCode: number;
}

export interface ConceptBoardForRender {
  runId: string;
  characterId?: string;
  promptSource: string;
  lanes: Array<{ laneIndex: number; pngPath: string }>;
  prompts: Array<{ laneIndex: number; variationAxis: string }>;
  createdAt: string;
}

const USAGE = "show: usage — artlab show <runId> [--open]";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderConceptBoardHtml(board: ConceptBoardForRender): string {
  const axisByLane = new Map<number, string>();
  for (const prompt of board.prompts) {
    axisByLane.set(prompt.laneIndex, prompt.variationAxis);
  }

  const sortedLanes = [...board.lanes].sort((a, b) => a.laneIndex - b.laneIndex);

  const tiles = sortedLanes
    .map((lane) => {
      const axis = axisByLane.get(lane.laneIndex) ?? "(no axis recorded)";
      const safeSrc = escapeHtml(lane.pngPath);
      const safeAxis = escapeHtml(axis);
      return `      <figure class="lane">
        <div class="lane-head">
          <span class="lane-index">Lane ${lane.laneIndex}</span>
          <span class="lane-axis">${safeAxis}</span>
        </div>
        <img src="${safeSrc}" alt="Lane ${lane.laneIndex} concept (${safeAxis})">
      </figure>`;
    })
    .join("\n");

  const safeRunId = escapeHtml(board.runId);
  const safeCharacter = escapeHtml(board.characterId ?? "(unknown character)");
  const safePromptSource = escapeHtml(board.promptSource);
  const safeCreatedAt = escapeHtml(board.createdAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ArtLab concept-board — ${safeRunId}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    background: #0c0c14;
    color: #e6e6f0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  }
  header {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 12px;
    row-gap: 4px;
    align-items: baseline;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #2a2a3a;
  }
  header h1 {
    grid-column: 1 / -1;
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #c9a84c;
  }
  header dt { color: #8a8aa0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  header dd { margin: 0; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
  }
  @media (max-width: 1100px) {
    .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 700px) {
    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .lane {
    margin: 0;
    background: #15151f;
    border: 1px solid #2a2a3a;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .lane-head {
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    border-bottom: 1px solid #2a2a3a;
  }
  .lane-index { font-weight: 600; color: #c9a84c; font-size: 13px; }
  .lane-axis {
    color: #b8b8c8;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    text-align: right;
  }
  .lane img {
    display: block;
    width: 100%;
    height: auto;
    background: #000;
  }
</style>
</head>
<body>
  <header>
    <h1>ArtLab concept-board</h1>
    <dt>runId</dt><dd>${safeRunId}</dd>
    <dt>characterId</dt><dd>${safeCharacter}</dd>
    <dt>promptSource</dt><dd>${safePromptSource}</dd>
    <dt>createdAt</dt><dd>${safeCreatedAt}</dd>
  </header>
  <section class="grid">
${tiles}
  </section>
</body>
</html>
`;
}

function defaultSpawnOpen(htmlPath: string): void {
  // Detached + ignored stdio so we don't keep the CLI alive on the open child.
  const child = spawn("open", [htmlPath], { stdio: "ignore", detached: true });
  child.unref();
}

export async function runShowSubcommand(
  input: ShowSubcommandInput,
): Promise<ShowSubcommandResult> {
  const [runId, ...rest] = input.args;
  if (!runId) {
    input.stderr(USAGE);
    return { exitCode: 2 };
  }

  const shouldOpen = rest.includes("--open");
  const runDir = join(input.workspaceRoot, "runs", runId);
  const boardPath = join(runDir, "concept-board.json");

  if (!existsSync(boardPath)) {
    input.stderr(`show: concept-board not found at ${boardPath}`);
    return { exitCode: 1 };
  }

  let board: ConceptBoardForRender;
  try {
    const raw = readFileSync(boardPath, "utf8");
    board = JSON.parse(raw) as ConceptBoardForRender;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    input.stderr(`show: failed to parse ${boardPath} (${msg})`);
    return { exitCode: 1 };
  }

  const html = renderConceptBoardHtml(board);
  const htmlPath = join(runDir, "concept-board.html");
  writeFileSync(htmlPath, html);
  input.stdout(htmlPath);

  if (shouldOpen) {
    if (process.platform === "darwin") {
      const opener = input.spawnOpen ?? defaultSpawnOpen;
      opener(htmlPath);
    } else {
      input.stderr(
        `show: --open is macOS-only; open ${htmlPath} manually on ${process.platform}`,
      );
    }
  }

  return { exitCode: 0 };
}
