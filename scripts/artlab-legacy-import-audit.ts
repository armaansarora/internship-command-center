// scripts/artlab-legacy-import-audit.ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"]@\/lib\/creative-production/,
  /from\s+['"]\.\.\/(\.\.\/)*creative-production/,
  /require\s*\(\s*['"]@\/lib\/creative-production/,
];

export interface AuditResult { violations: { file: string; line: number; match: string }[]; }

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

export async function auditLegacyImports(input: { rootDir: string }): Promise<AuditResult> {
  const violations: AuditResult["violations"] = [];
  for (const file of walk(input.rootDir)) {
    // Re-exports from src/lib/artlab/<module>/index.ts are explicitly allowed
    // (they ARE the salvage bridge); the audit only catches imports of legacy.
    if (file.match(/\/(budget|scheduler|providers|promotion|review|cleanup|contracts)\/index\.ts$/)) continue;
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({ file, line: i + 1, match: line.trim() });
        }
      }
    }
  }
  return { violations };
}
