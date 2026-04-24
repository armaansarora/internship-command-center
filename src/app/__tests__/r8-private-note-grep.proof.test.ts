import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

/**
 * R8 P5 — private_note may never leak outside the user's own surface.
 *
 * The column is readable by the user who owns the row (RLS enforced at
 * the DB) and is rendered by two UI surfaces (the Rolodex card and the
 * Contact modal).  It must NEVER appear in:
 *
 *   - AI-prompt composition (src/lib/ai/**)
 *   - Export pipelines (src/app/api/export/** if it exists)
 *   - Cross-user / networking endpoints (src/app/api/networking/**)
 *
 * It may only appear in an allowlist of files. Any new reference must
 * be consciously added to the allowlist below, which is the point:
 * every PR that touches private_note is forced to justify the surface.
 */

const ROOT = resolve(process.cwd());
const PATTERN = /privateNote|private_note/;

const ALLOWLIST = new Set<string>([
  // Schema
  "src/db/schema.ts",
  "src/db/__tests__/schema-r8.test.ts",
  // SQL migration
  "src/db/migrations/0018_r8_rolodex_lounge.sql",
  // Owner-only read path + mutation path
  "src/lib/db/queries/contacts-rest.ts",
  "src/lib/db/queries/contacts-mutations.ts",
  "src/lib/actions/contacts.ts",
  // UI surfaces
  "src/components/floor-6/rolodex/RolodexCard.tsx",
  "src/components/floor-6/rolodex/Rolodex.test.tsx",
  "src/components/floor-6/rolodex/Rolodex.tsx",
  "src/components/floor-6/contact-grid/ContactCard.test.tsx",
  "src/components/floor-6/crud/ContactModal.tsx",
  // The acceptance script itself will grep for this string
  "scripts/r8-acceptance-check.ts",
  // This proof test
  "src/app/__tests__/r8-private-note-grep.proof.test.ts",
  // Red Team test references the canonical Q7 phrasing that mentions
  // 'private_note ever appear' from the checklist markdown.
  "src/app/__tests__/r8-red-team.proof.test.ts",
  // R10.14 — defensive privateNote destructure before LLM prompt.
  // draftReferenceRequest strips privateNote off the contact object
  // before JSON.stringify reaches the LLM (P5 invariant preserved).
  "src/lib/ai/structured/reference-request.ts",
  // R10.14 — regression test for the P5 strip: seeds a contact with
  // privateNote: "SECRET: ..." and asserts the prompt never contains
  // that string. The word 'privateNote' appears only in fixture/asserts.
  "src/lib/ai/structured/__tests__/reference-request.test.ts",
  // R10.14 — route comment documents the P5 guarantee for the
  // reference-request endpoint. No privateNote data crosses the boundary.
  "src/app/api/contacts/[id]/reference-request/route.ts",
  // R10.14 — ReferenceRequestPanel test fixture includes
  // `privateNote: null` for type-shape completeness of ContactForAgent.
  "src/components/parlor/ReferenceRequestPanel.test.tsx",
]);

// R10.14 — AI-prompt composition path exemptions.
// The blanket "src/lib/ai/**" grep rejects ANY reference to privateNote,
// but reference-request.ts must NAME the field in order to destructure
// it OUT before serialization (the P5 defensive strip). Its sibling test
// must also NAME the field to assert the strip holds. These two files
// are the ONLY permitted mentions inside src/lib/ai/**; any future file
// under src/lib/ai/ that references privateNote is a real leak.
const AI_PROMPT_ALLOWLIST = new Set<string>([
  "src/lib/ai/structured/reference-request.ts",
  "src/lib/ai/structured/__tests__/reference-request.test.ts",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  try {
    statSync(dir);
  } catch {
    return out;
  }
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx|sql)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

describe("R8 P5 — private_note allowlist", () => {
  it("no AI prompt composition path references privateNote / private_note", () => {
    const files = walk(resolve(ROOT, "src/lib/ai"));
    const offenders: string[] = [];
    for (const f of files) {
      const rel = relative(ROOT, f);
      if (AI_PROMPT_ALLOWLIST.has(rel)) continue;
      const body = readFileSync(f, "utf8");
      if (PATTERN.test(body)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("no cross-user / networking endpoint references private_note", () => {
    const files = walk(resolve(ROOT, "src/app/api/networking"));
    const offenders: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      if (PATTERN.test(body)) offenders.push(relative(ROOT, f));
    }
    expect(offenders).toEqual([]);
  });

  it("no export pipeline references private_note", () => {
    const files = walk(resolve(ROOT, "src/app/api/export"));
    const offenders: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      if (PATTERN.test(body)) offenders.push(relative(ROOT, f));
    }
    expect(offenders).toEqual([]);
  });

  it("all other src/ and scripts/ references are allowlisted", () => {
    const files = [...walk(resolve(ROOT, "src")), ...walk(resolve(ROOT, "scripts"))];
    const offenders: string[] = [];
    for (const f of files) {
      const rel = relative(ROOT, f);
      if (ALLOWLIST.has(rel)) continue;
      const body = readFileSync(f, "utf8");
      if (PATTERN.test(body)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
