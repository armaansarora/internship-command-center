import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Orrery perf invariants.
 *
 * 60fps@100 partner constraint. JSDOM cannot measure real frame times,
 * so we assert the architectural invariants that make 60fps achievable:
 *  - exactly one gsap.timeline() drives all orbit rotations (single RAF loop)
 *  - CSS containment is set on the planet element
 *  - will-change is scoped to orbit groups, NEVER per-planet (avoids layer
 *    explosion at 100+ planets)
 *  - transform-style: preserve-3d lives in orrery.css and ONLY there in
 *    the orrery render path
 *
 * If any of these regress, the orrery's perf falls off a cliff at >50
 * planets. The test exists to prevent that.
 */

const ROOT = process.cwd();
const ORRERY_RENDER_PATH = "src/components/floor-2/orrery/OrreryRender.tsx";
const ORRERY_CSS_PATH = "src/components/floor-2/orrery/orrery.css";
const FLOOR_2_DIR = "src/components/floor-2";

function readSource(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf8");
}

/**
 * Strip /* ... *\/ block comments and // line comments from source so we can
 * reason about what the file actually *uses* (vs what it merely *mentions*
 * in documentation). The orrery render path documents the preserve-3d
 * invariant in JSDoc — those mentions are not violations.
 */
function stripComments(source: string): string {
  // Remove /* ... */ block comments (greedy across lines).
  let out = source.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove // line comments (to end of line).
  out = out.replace(/\/\/[^\n]*/g, "");
  return out;
}

/**
 * Recursively walk a directory and yield every file path (relative to ROOT).
 * Stdlib only — no glob dep needed for a 1-shot perf test.
 */
function walkFiles(dirRel: string): string[] {
  const results: string[] = [];
  const stack: string[] = [resolve(ROOT, dirRel)];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        results.push(relative(ROOT, full));
      }
    }
  }
  return results;
}

describe("single GSAP timeline drives all orbits", () => {
  it("OrreryRender.tsx contains AT MOST one gsap.timeline() call", () => {
    // Strip comments first — the file documents the invariant in JSDoc and
    // an inline comment, both of which contain the literal `gsap.timeline(`
    // for prose. Only runtime calls count toward the perf invariant.
    const src = stripComments(readSource(ORRERY_RENDER_PATH));
    const matches = src.match(/gsap\.timeline\(/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("OrreryRender.tsx contains exactly one gsap.timeline() call (the orbit loop)", () => {
    // Tightens the previous assertion: the orbit timeline MUST exist. If
    // someone removes it, the orrery stops spinning silently — the test
    // catches that too.
    const src = stripComments(readSource(ORRERY_RENDER_PATH));
    const matches = src.match(/gsap\.timeline\(/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe("CSS containment on planet", () => {
  it(".orrery-planet rule body declares `contain: layout paint`", () => {
    const css = readSource(ORRERY_CSS_PATH);
    // Match the bare .orrery-planet rule (first hit), not the modifier
    // selectors like .orrery-planet.orrery-supernova.
    const match = css.match(/\.orrery-planet\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match?.[1] ?? "";
    expect(body).toMatch(/contain\s*:\s*layout\s+paint/);
  });
});

describe("will-change scoped to orbit, NEVER per-planet", () => {
  it(".orrery-orbit rule body declares will-change", () => {
    const css = readSource(ORRERY_CSS_PATH);
    const match = css.match(/\.orrery-orbit\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match?.[1] ?? "";
    expect(body).toMatch(/will-change/);
  });

  it(".orrery-planet (bare) rule body does NOT declare will-change", () => {
    const css = readSource(ORRERY_CSS_PATH);
    const match = css.match(/\.orrery-planet\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match?.[1] ?? "";
    expect(body).not.toMatch(/will-change/);
  });
});

describe("preserve-3d lives in orrery.css and ONLY there in floor-2", () => {
  it("orrery.css declares transform-style: preserve-3d", () => {
    const css = readSource(ORRERY_CSS_PATH);
    expect(css).toMatch(/transform-style\s*:\s*preserve-3d/);
  });

  it("no other floor-2 source file USES preserve-3d (doc-comment mentions allowed)", () => {
    const allFiles = walkFiles(FLOOR_2_DIR);
    const offenders: string[] = [];
    for (const relPath of allFiles) {
      // Only inspect text-source files; skip binaries/assets.
      if (!/\.(tsx?|css|scss)$/.test(relPath)) continue;
      // The CSS file is the sanctioned home — skip it.
      if (relPath === ORRERY_CSS_PATH) continue;

      const src = readSource(relPath);
      const stripped = stripComments(src);
      // Look for actual usage: either the CSS form `transform-style: preserve-3d`
      // or the JS/inline-style form `transformStyle: "preserve-3d"`.
      // Mere occurrence of the bare token "preserve-3d" inside a string
      // literal in non-style code is too liberal — we want the use site.
      if (
        /transform-style\s*:\s*preserve-3d/.test(stripped) ||
        /transformStyle\s*:\s*["']preserve-3d["']/.test(stripped)
      ) {
        offenders.push(relPath);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("OrreryRender uses the centralized gsap import", () => {
  it("imports gsap from @/lib/gsap-init", () => {
    const src = readSource(ORRERY_RENDER_PATH);
    expect(src).toMatch(
      /import\s*\{[^}]*\bgsap\b[^}]*\}\s*from\s*["']@\/lib\/gsap-init["']/,
    );
  });

  it("does NOT import gsap directly from the top-level package", () => {
    const src = readSource(ORRERY_RENDER_PATH);
    // Negative match: any import ending in "gsap" (with no alias prefix).
    // Allow the centralized init path; reject the bare package path.
    expect(src).not.toMatch(/from\s*["']gsap["']/);
  });
});
