import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";

const AUTOPILOT_PATH = ".tower/autopilot.yml";
const ROADMAP_PATH = "docs/NEXT-ROADMAP.md";

export interface AutopilotState {
  paused?: boolean;
  scope?: string;
  started?: string | null;
  started_by?: string | null;
  ended?: string | null;
  ended_reason?: string | null;
  max_blockers?: number;
  previous_phase?: string | null;
  previous_outcome?: string | null;
  next_phase?: string | null;
  next_brief?: string | null;
  open_blockers_carrying_forward?: string[];
  verification_before_acceptance?: string[];
  partner_constraints?: string[];
  [key: string]: unknown;
}

export async function readAutopilot(
  repo: string,
): Promise<AutopilotState | null> {
  const p = path.join(repo, AUTOPILOT_PATH);
  if (!(await fs.pathExists(p))) return null;
  const raw = await fs.readFile(p, "utf-8");
  return YAML.parse(raw) as AutopilotState;
}

export interface AutopilotLintIssue {
  field: string;
  message: string;
}

// Catches the class of bug we saw in R4: ended timestamp before started. Any
// other semantic checks (e.g., scope format) go here too.
export function lintAutopilotState(state: AutopilotState): AutopilotLintIssue[] {
  const issues: AutopilotLintIssue[] = [];
  if (state.started && state.ended) {
    const s = Date.parse(state.started);
    const e = Date.parse(state.ended);
    if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
      issues.push({
        field: "ended",
        message: `ended (${state.ended}) is before started (${state.started})`,
      });
    }
  }
  if (state.scope && !/^(all|R\d+(-R\d+)?(-only)?)$/.test(state.scope)) {
    issues.push({
      field: "scope",
      message: `scope "${state.scope}" doesn't match expected form (all | R<n>-only | R<n>-R<m>)`,
    });
  }
  if (
    state.next_phase &&
    !/^R\d+$/.test(state.next_phase as string)
  ) {
    issues.push({
      field: "next_phase",
      message: `next_phase "${state.next_phase}" is not of the form R<n>`,
    });
  }
  return issues;
}

export async function writeAutopilot(
  repo: string,
  state: AutopilotState,
): Promise<void> {
  const issues = lintAutopilotState(state);
  if (issues.length > 0) {
    throw new Error(
      `autopilot state invalid — ${issues
        .map((i) => `${i.field}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const p = path.join(repo, AUTOPILOT_PATH);
  await fs.ensureDir(path.dirname(p));
  await fs.writeFile(p, YAML.stringify(state), "utf-8");
}

// Finds the next R-phase heading in the roadmap after the given phase.
// Returns the section number + phase identifier or null if no next phase.
export async function findNextPhaseBrief(
  repo: string,
  completedPhase: string,
): Promise<{ nextPhase: string; brief: string } | null> {
  const p = path.join(repo, ROADMAP_PATH);
  if (!(await fs.pathExists(p))) return null;
  const raw = await fs.readFile(p, "utf-8");

  const completedNum = Number(completedPhase.replace(/\D/g, ""));
  if (Number.isNaN(completedNum)) return null;
  const nextNum = completedNum + 1;
  const nextPhase = `R${nextNum}`;

  const headingRe = new RegExp(
    `^### (${nextPhase}) — (.+)$`,
    "m",
  );
  const match = headingRe.exec(raw);
  if (!match) return null;

  // Brief pointer format matches what partners have been writing manually:
  // "docs/NEXT-ROADMAP.md §<num> R<n> — <name>"
  // Section numbers aren't stable in the markdown so we reference the heading text.
  return {
    nextPhase,
    brief: `docs/NEXT-ROADMAP.md — ### ${match[1]} — ${match[2]}`,
  };
}

// Advance the autopilot file state after a phase's acceptance flips to true.
// Does NOT touch `paused` — the user controls the trigger. All we do is prep
// the next scope + carry forward blockers + record the previous outcome so the
// user's next re-prime is a single flip of `paused: false`.
export async function advanceAutopilotScope(
  repo: string,
  completedPhase: string,
  opts: {
    previousOutcome: string;
    carryBlockers: string[];
    ended?: string;
  },
): Promise<{ nextPhase: string; brief: string } | null> {
  const state = await readAutopilot(repo);
  if (!state) return null;

  const next = await findNextPhaseBrief(repo, completedPhase);
  if (!next) return null;

  const ended = opts.ended ?? new Date().toISOString();

  const updated: AutopilotState = {
    ...state,
    paused: true,
    scope: `${next.nextPhase}-only`,
    started: null,
    started_by: null,
    ended,
    ended_reason: `scope_complete — ${completedPhase} acceptance.met=true`,
    previous_phase: completedPhase,
    previous_outcome: opts.previousOutcome,
    next_phase: next.nextPhase,
    next_brief: next.brief,
    open_blockers_carrying_forward:
      opts.carryBlockers.length > 0 ? opts.carryBlockers : undefined,
  };

  // Strip undefined so they don't emit as `null` or blank lines in YAML.
  for (const k of Object.keys(updated) as Array<keyof AutopilotState>) {
    if (updated[k] === undefined) delete updated[k];
  }

  await writeAutopilot(repo, updated);
  return next;
}
