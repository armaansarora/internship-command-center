#!/usr/bin/env tsx
/**
 * Audit security headers on a deployed URL. Used after every deploy and in
 * CI to prove we still earn an A on securityheaders.com.
 *
 * Usage:  SECURITY_SCAN_URL=https://tower-preview.vercel.app npx tsx scripts/check-security-headers.ts
 */
import { execa } from "execa";

const BASE = process.env.SECURITY_SCAN_URL ?? "http://localhost:3000";

const REQUIRED = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
];

async function main() {
  const { stdout, exitCode } = await execa("curl", ["-sI", BASE], { reject: false });
  if (exitCode !== 0) {
    console.error(`curl failed for ${BASE}`);
    process.exit(2);
  }

  const lines = stdout.toLowerCase().split(/\r?\n/);
  const have = new Set(lines.map((l) => l.split(":")[0].trim()).filter(Boolean));
  const missing = REQUIRED.filter((h) => !have.has(h));
  const hasCsp = have.has("content-security-policy") || have.has("content-security-policy-report-only");

  const report = {
    scanned: BASE,
    missing,
    hasCsp,
    ok: missing.length === 0 && hasCsp,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
