import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RiskCompliance — General #3 (PII inventory).
 *
 * `audit_logs.metadata` is the durable forensic surface for the entire
 * app.  PR4 (Trust Console) made it user-visible, which raises the bar:
 * raw third-party email addresses, raw email bodies, and other PII
 * must NEVER land in `metadata` directly.  Helpers in
 * `src/lib/audit/pii-redact.ts` exist for the supported call sites.
 *
 * This proof greps for known PII keys in audit-metadata writes and
 * fails if a future PR re-introduces a raw form (e.g. `to: email`,
 * `from: "x@y"`, `body: "..."`).
 */

const ROOT = process.cwd();

/**
 * Files where `metadata: { ... }` blocks live alongside an
 * `audit_logs` insert (i.e. anywhere we audit security events).  The
 * walker scans these for banned raw keys (`to:`, `from:`, `body:`).
 */
function isAuditCallSite(src: string): boolean {
  return (
    src.includes("logSecurityEvent") ||
    src.includes("recordRevokeCascade") ||
    src.includes('from("audit_logs")') ||
    src.includes("logConsentEvent")
  );
}

function walk(dir: string, exts: readonly string[]): string[] {
  const out: string[] = [];
  function recur(d: string): void {
    let entries: string[] = [];
    try {
      entries = readdirSync(resolve(ROOT, d));
    } catch {
      return;
    }
    for (const name of entries) {
      const rel = `${d}/${name}`;
      let stat;
      try {
        stat = statSync(resolve(ROOT, rel));
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === ".next") continue;
        recur(rel);
      } else if (exts.some((e) => rel.endsWith(e))) {
        out.push(rel);
      }
    }
  }
  recur(dir);
  return out;
}

describe("R12 — PII discipline in audit metadata writers", () => {
  /** Every file that touches the audit pipeline. Used to scope the
   *  static-grep checks below so we don't accidentally flag non-audit
   *  uses of `to:` (e.g. `to: NextResponse.redirect(...)`). */
  const auditFiles = walk("src", [".ts", ".tsx"]).filter((f) => {
    if (/__tests__|\.test\.|\.spec\./.test(f)) return false;
    return isAuditCallSite(readFileSync(resolve(ROOT, f), "utf8"));
  });

  it("audit metadata writers never persist a `to:` raw recipient field", () => {
    const offenders: Array<{ file: string; line: number; snippet: string }> = [];
    for (const file of auditFiles) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      // Find every `metadata:` block and scan a window forward for
      // a bare `to:` key.
      const idxs: number[] = [];
      let i = 0;
      while ((i = src.indexOf("metadata:", i)) !== -1) {
        idxs.push(i);
        i += 1;
      }
      for (const start of idxs) {
        const window = src.slice(start, start + 400);
        // Match `to:` as an object-literal key, not as `to_hash:` or
        // `route:`.  Lookahead/behind enforce the boundary.
        if (/(^|[\s,{])to:\s*[^\n]/m.test(window) && !window.includes("to_hash")) {
          // Find approximate line.
          const before = src.slice(0, start);
          const line = before.split("\n").length;
          offenders.push({
            file,
            line,
            snippet: window.split("\n")[0],
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("audit metadata writers never persist a `from:` raw sender field", () => {
    const offenders: Array<{ file: string; line: number }> = [];
    for (const file of auditFiles) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      let i = 0;
      const idxs: number[] = [];
      while ((i = src.indexOf("metadata:", i)) !== -1) {
        idxs.push(i);
        i += 1;
      }
      for (const start of idxs) {
        const window = src.slice(start, start + 400);
        if (/(^|[\s,{])from:\s*[^\n]/m.test(window) && !window.includes("from_hash")) {
          const before = src.slice(0, start);
          const line = before.split("\n").length;
          offenders.push({ file, line });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("audit metadata writers never persist a raw `body:` field", () => {
    const offenders: Array<{ file: string; line: number }> = [];
    for (const file of auditFiles) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      let i = 0;
      const idxs: number[] = [];
      while ((i = src.indexOf("metadata:", i)) !== -1) {
        idxs.push(i);
        i += 1;
      }
      for (const start of idxs) {
        const window = src.slice(start, start + 400);
        if (/(^|[\s,{])body:\s*[^\n]/m.test(window)) {
          const before = src.slice(0, start);
          const line = before.split("\n").length;
          offenders.push({ file, line });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the pii-redact helpers exist and export the expected surface", () => {
    const src = readFileSync(
      resolve(ROOT, "src/lib/audit/pii-redact.ts"),
      "utf8",
    );
    expect(src).toMatch(/export function hashForAudit\b/);
    expect(src).toMatch(/export function hashForAuditOrNull\b/);
    expect(src).toMatch(/export function redactSnippetForAudit\b/);
  });

  it("Sentry serialiser in logger.ts redacts email addresses by pattern", () => {
    // logger.ts has a static rule that turns any bare email address
    // into `[omitted]` before Sentry sees it.  We pin the regex here
    // so a future PR doesn't quietly delete it.
    const src = readFileSync(resolve(ROOT, "src/lib/logger.ts"), "utf8");
    expect(src).toMatch(
      /\/\^\[\^@\\s\]\+@\[\^@\\s\]\+\\\.\[\^@\\s\]\+\$\//,
    );
    // And the `[omitted]` substitution still references the same flow.
    expect(src).toMatch(/return\s+"\[omitted\]"/);
  });
});

