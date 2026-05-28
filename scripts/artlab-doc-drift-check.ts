#!/usr/bin/env tsx
/**
 * ArtLab doc-drift guard
 *
 * Two `.md` docs describe state that lives elsewhere in the repo:
 *
 *   1. `docs/artlab/CHARACTER-PIPELINE.md` — the character roster table
 *      should match the canonical YAMLs in
 *      `docs/artlab/sdk/canon/characters/*.yaml`.
 *
 *   2. `docs/artlab/ENGINE.md` — the phase list + blocker list should
 *      match `ARTLAB_PHASES` and `ARTLAB_BLOCKERS` in
 *      `src/lib/artlab/types.ts`.
 *
 * Before this guard, the docs lied about 7 of 12 characters (claimed Sol
 * was the COO on Floor 4 when canon makes her the CNO on Floor 6), and
 * the engine doc undercounted phases (10 of 13) and blockers (7 of 8).
 * Operators reading those docs would form an incorrect mental model.
 *
 * Determinism: same canon + same types → same expected table. If canon
 * adds a 13th character or types adds a 14th phase, this guard exits 1
 * with a precise diff so the docs get regenerated.
 *
 * Tested by `scripts/artlab-doc-drift-check.test.ts` (vitest).
 * Wired to CI by `.github/workflows/artlab-doc-drift.yml`.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ARTLAB_PHASES, ARTLAB_BLOCKERS } from "@/lib/artlab/types";

const REPO_ROOT_DEFAULT = resolve(__dirname, "..");

export interface CharacterCanonRow {
  id: string;
  roleSlug: string;
  displayName: string;
  title: string;
  floorLabel: string;
}

export interface DriftCheckOptions {
  repoRoot?: string;
}

export interface DriftCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * Load every canon character YAML and return the canonical roster sorted
 * by character id. The sort makes the expected table reproducible across
 * filesystems whose `readdirSync` ordering differs.
 */
export function loadCharacterCanonRoster(repoRoot: string): CharacterCanonRow[] {
  const dir = join(repoRoot, "docs/artlab/sdk/canon/characters");
  if (!existsSync(dir)) {
    throw new Error(`Canon characters directory missing: ${dir}`);
  }
  const rows: CharacterCanonRow[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".yaml")) continue;
    const raw = readFileSync(join(dir, entry), "utf8");
    const parsed = parseYaml(raw) as {
      header?: { id?: unknown };
      roleSlug?: unknown;
      displayName?: unknown;
      title?: unknown;
      floorLabel?: unknown;
    };
    const id = typeof parsed.header?.id === "string" ? parsed.header.id : "";
    const roleSlug = typeof parsed.roleSlug === "string" ? parsed.roleSlug : "";
    const displayName = typeof parsed.displayName === "string" ? parsed.displayName : "";
    const title = typeof parsed.title === "string" ? parsed.title : "";
    const floorLabel = typeof parsed.floorLabel === "string" ? parsed.floorLabel : "";
    if (!id || !roleSlug || !displayName || !title || !floorLabel) {
      throw new Error(`Canon character ${entry} missing required field(s).`);
    }
    rows.push({ id, roleSlug, displayName, title, floorLabel });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return rows;
}

/**
 * Parse the `## Character roster` markdown table out of
 * CHARACTER-PIPELINE.md. The table is expected to have columns
 * `ID | Floor | Role | Status` (4 columns including the leading and
 * trailing pipes — header + separator + body rows).
 */
export interface DocCharacterRow {
  id: string;
  floor: string;
  role: string;
  status: string;
}

export function parseCharacterRosterTable(markdown: string): DocCharacterRow[] {
  const lines = markdown.split("\n");
  const headerIdx = lines.findIndex((line) =>
    /^\|\s*ID\s*\|\s*Floor\s*\|\s*Role\s*\|\s*Status\s*\|/i.test(line),
  );
  if (headerIdx === -1) {
    throw new Error(
      "CHARACTER-PIPELINE.md: could not find the character roster table — " +
        "expected a markdown table starting with `| ID | Floor | Role | Status |`.",
    );
  }
  const rows: DocCharacterRow[] = [];
  // headerIdx + 1 is the `|---|---|---|---|` separator; body starts at +2.
  for (let i = headerIdx + 2; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    rows.push({
      id: cells[0]!,
      floor: cells[1]!,
      role: cells[2]!,
      status: cells[3]!,
    });
  }
  return rows;
}

/**
 * The character table is informative-but-loose: it summarises Floor + Role
 * for humans. Strict equality with the YAMLs would require every floorLabel
 * to land verbatim in the doc, which fights readability. Instead we use
 * conservative substring checks: doc rows must NOT contradict canon.
 *
 * Specifically:
 *   - Doc must include every canon id (no missing characters).
 *   - Doc must NOT include ids that aren't in canon.
 *   - For each id present in both:
 *       * doc.floor must mention the canonical floorId fragment (lowercased)
 *         OR the canonical floorLabel verbatim (case-insensitive).
 *       * doc.role must mention the canonical roleSlug (uppercased) OR
 *         the canonical title (case-insensitive).
 *
 * This catches the actual drift cited in the spec (e.g. sol listed as
 * "Floor 4" + "COO" when canon says floorId rolodex-lounge / roleSlug cno).
 */
export function compareCharacterRosters(
  canon: CharacterCanonRow[],
  doc: DocCharacterRow[],
): string[] {
  const errors: string[] = [];
  // The doc may use short ids (e.g. `rafe`, `sol`) while canon files use
  // full ids (e.g. `rafe-calder`, `sol-navarro`). Allow either by matching
  // on the canonical id OR on the first hyphen segment of the canonical id.
  const docIndex = new Map<string, DocCharacterRow>();
  for (const row of doc) docIndex.set(row.id, row);
  for (const canonRow of canon) {
    const candidates = [canonRow.id, canonRow.id.split("-")[0]!];
    const docRow = candidates.map((c) => docIndex.get(c)).find((r) => r);
    if (!docRow) {
      errors.push(
        `CHARACTER-PIPELINE.md: canon character "${canonRow.id}" (${canonRow.displayName}) is missing from the roster table.`,
      );
      continue;
    }
    const docFloorLower = docRow.floor.toLowerCase();
    const floorIdLower = canonRow.floorLabel.toLowerCase();
    const floorWords = floorIdLower.match(/floor\s*\d+/) ?? [];
    // Match if doc cell contains the canon floorLabel verbatim, OR the
    // canon `Floor N` token, OR — for floors that lack a number (e.g.
    // "The Vault") — the bare room name lowercased.
    const floorOk =
      docFloorLower.includes(floorIdLower) ||
      (floorWords[0] !== undefined && docFloorLower.includes(floorWords[0])) ||
      docFloorLower.includes(floorIdLower.replace(/^.*—\s*/, ""));
    if (!floorOk) {
      errors.push(
        `CHARACTER-PIPELINE.md: row "${docRow.id}" says floor="${docRow.floor}" — ` +
          `canon expects something matching "${canonRow.floorLabel}".`,
      );
    }
    const docRoleLower = docRow.role.toLowerCase();
    const titleLower = canonRow.title.toLowerCase();
    const roleSlugUpper = canonRow.roleSlug.toUpperCase();
    const roleOk =
      docRoleLower.includes(titleLower) ||
      docRow.role.includes(roleSlugUpper) ||
      docRoleLower.includes(canonRow.roleSlug.toLowerCase());
    if (!roleOk) {
      errors.push(
        `CHARACTER-PIPELINE.md: row "${docRow.id}" says role="${docRow.role}" — ` +
          `canon expects "${canonRow.title}" / roleSlug "${canonRow.roleSlug}".`,
      );
    }
  }
  const canonIds = new Set<string>();
  for (const row of canon) {
    canonIds.add(row.id);
    canonIds.add(row.id.split("-")[0]!);
  }
  for (const docRow of doc) {
    if (!canonIds.has(docRow.id)) {
      errors.push(
        `CHARACTER-PIPELINE.md: row "${docRow.id}" is not in canon. Either remove the row or add a canon YAML.`,
      );
    }
  }
  return errors;
}

/**
 * Parse a fenced or inline phase chain like:
 *
 *   `routed → generating-concepts → concept-review → ...`
 *
 * out of ENGINE.md. Returns the ordered phase names. The check then
 * compares that list to ARTLAB_PHASES (in order) — both presence AND order
 * must match so the doc reflects the engine's actual progression.
 */
export function parseEnginePhaseChain(markdown: string): string[] {
  // Find the first `phase state machine` heading, then the first chain line
  // containing the arrow separator. This keeps the parser resilient to
  // additional prose before the chain.
  const lines = markdown.split("\n");
  for (const line of lines) {
    if (!line.includes("→")) continue;
    const tokens = line.split("→").map((t) =>
      t
        // Strip backticks, code fences, leading prose, and trailing comments.
        .replace(/`/g, "")
        .replace(/[*_]/g, "")
        .trim(),
    );
    // Heuristic: this is the phase chain if every token looks like a phase
    // slug — lowercase, hyphenated, no spaces.
    if (tokens.length >= 3 && tokens.every((t) => /^[a-z0-9-]+$/.test(t))) {
      return tokens;
    }
  }
  throw new Error(
    "ENGINE.md: could not find a phase chain line — expected something like " +
      "`routed → briefing → ... → closed`.",
  );
}

/**
 * Extract the blocker list from ENGINE.md. Looks for a line mentioning
 * "blockers" followed by a comma-separated list of inline-code names.
 */
export function parseEngineBlockerList(markdown: string): string[] {
  // Match a paragraph that introduces the blockers, then capture every
  // `code-fenced` slug after it. Keeps "orthogonal blockers" wording
  // optional — operators sometimes write "Blockers:" instead.
  const regex = /blockers?[^:]*:\s*((?:`[a-z0-9-]+`[\s,]*)+)/i;
  const match = markdown.match(regex);
  if (!match) {
    throw new Error(
      "ENGINE.md: could not find a blocker list — expected a paragraph like " +
        "`Plus N orthogonal blockers: \\`needs-human\\`, \\`budget-blocked\\`, ...`.",
    );
  }
  const slugs = Array.from(match[1]!.matchAll(/`([a-z0-9-]+)`/g)).map((m) => m[1]!);
  return slugs;
}

export function compareEnginePhases(canonPhases: readonly string[], docPhases: string[]): string[] {
  const errors: string[] = [];
  if (canonPhases.length !== docPhases.length) {
    errors.push(
      `ENGINE.md: phase chain has ${docPhases.length} entries, but ARTLAB_PHASES has ${canonPhases.length}. ` +
        `\n  doc:    ${docPhases.join(" → ")}` +
        `\n  canon:  ${canonPhases.join(" → ")}`,
    );
    return errors;
  }
  for (let i = 0; i < canonPhases.length; i += 1) {
    if (canonPhases[i] !== docPhases[i]) {
      errors.push(
        `ENGINE.md: phase chain index ${i} — doc has "${docPhases[i]}", canon expects "${canonPhases[i]}".`,
      );
    }
  }
  return errors;
}

export function compareEngineBlockers(canonBlockers: readonly string[], docBlockers: string[]): string[] {
  const errors: string[] = [];
  const canonSet = new Set(canonBlockers);
  const docSet = new Set(docBlockers);
  for (const blocker of canonBlockers) {
    if (!docSet.has(blocker)) {
      errors.push(`ENGINE.md: blocker "${blocker}" is missing from the doc.`);
    }
  }
  for (const blocker of docBlockers) {
    if (!canonSet.has(blocker)) {
      errors.push(`ENGINE.md: blocker "${blocker}" appears in the doc but is not in ARTLAB_BLOCKERS.`);
    }
  }
  return errors;
}

export function runDocDriftCheck(options: DriftCheckOptions = {}): DriftCheckResult {
  const repoRoot = options.repoRoot ?? REPO_ROOT_DEFAULT;
  const errors: string[] = [];

  // ── Character roster ───────────────────────────────────────────────────
  const canon = loadCharacterCanonRoster(repoRoot);
  const characterPipelinePath = join(repoRoot, "docs/artlab/CHARACTER-PIPELINE.md");
  if (!existsSync(characterPipelinePath)) {
    errors.push(`Missing ${characterPipelinePath}`);
  } else {
    const md = readFileSync(characterPipelinePath, "utf8");
    try {
      const doc = parseCharacterRosterTable(md);
      errors.push(...compareCharacterRosters(canon, doc));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Engine phases + blockers ───────────────────────────────────────────
  const enginePath = join(repoRoot, "docs/artlab/ENGINE.md");
  if (!existsSync(enginePath)) {
    errors.push(`Missing ${enginePath}`);
  } else {
    const md = readFileSync(enginePath, "utf8");
    try {
      const phases = parseEnginePhaseChain(md);
      errors.push(...compareEnginePhases(ARTLAB_PHASES, phases));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
    try {
      const blockers = parseEngineBlockerList(md);
      errors.push(...compareEngineBlockers(ARTLAB_BLOCKERS, blockers));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { ok: errors.length === 0, errors };
}

function formatReport(result: DriftCheckResult, repoRoot: string): string {
  if (result.ok) {
    return `ArtLab doc-drift check: OK (canon + types match docs in ${repoRoot}).`;
  }
  return [
    "ArtLab doc-drift check: FAIL",
    "",
    "The following docs no longer match canon/types. Regenerate them — do",
    "not edit canon/types to silence this check (canon is the source of truth).",
    "",
    ...result.errors.map((e) => `  • ${e}`),
  ].join("\n");
}

// ── CLI entrypoint ────────────────────────────────────────────────────────
// When run directly: print report, exit 0/1. When imported (e.g. by the
// vitest harness), only the named exports above are used.
if (require.main === module) {
  const result = runDocDriftCheck();
  const out = formatReport(result, REPO_ROOT_DEFAULT);
  if (result.ok) {
    process.stdout.write(out + "\n");
    process.exit(0);
  } else {
    process.stderr.write(out + "\n");
    process.exit(1);
  }
}
