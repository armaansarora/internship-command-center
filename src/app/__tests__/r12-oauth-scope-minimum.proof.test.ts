import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RiskCompliance — General #4 (OAuth scope minimum).
 *
 * Today we request EXACTLY these Google OAuth scopes:
 *
 *   - https://www.googleapis.com/auth/gmail.readonly
 *   - https://www.googleapis.com/auth/calendar.events
 *
 * The scope list is the contract Google shows the user on the consent
 * screen.  Adding a new scope MUST be a deliberate review event:
 *
 *   1. Update the scope array in `src/lib/gmail/oauth.ts`.
 *   2. Add a matching justification comment naming the call site.
 *   3. Update the ALLOWED_SCOPES set below.
 *
 * This proof test fails on any drift in either direction.
 */

const ROOT = process.cwd();

const ALLOWED_SCOPES = new Set<string>([
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
]);

/**
 * Broader scopes we MUST refuse to request — listing them explicitly
 * so a typo in a future PR doesn't silently widen the consent prompt.
 * Any of these landing in `getGmailAuthUrl` would be a regression.
 */
const FORBIDDEN_BROADER_SCOPES = [
  // Full Gmail read+write+send.
  "https://mail.google.com/",
  // Full Gmail mailbox modify.
  "https://www.googleapis.com/auth/gmail.modify",
  // Full Gmail send (replies, drafts, etc.) — even though we technically
  // send via Resend, never request this scope.
  "https://www.googleapis.com/auth/gmail.send",
  // Full Gmail compose drafts.
  "https://www.googleapis.com/auth/gmail.compose",
  // Calendar metadata for ALL calendars (not just primary event read/write).
  "https://www.googleapis.com/auth/calendar",
  // Drive — we do NOT integrate Drive today. Adding this scope without
  // landing the integration would be an unjustified consent ask.
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
] as const;

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

describe("R12 — OAuth scope minimum", () => {
  const oauthSrc = readFileSync(resolve(ROOT, "src/lib/gmail/oauth.ts"), "utf8");

  it("getGmailAuthUrl requests exactly the allowed scope set", () => {
    // Extract the `const scopes = [ ... ]` block.
    const blockMatch = oauthSrc.match(/const\s+scopes\s*=\s*\[([\s\S]*?)\]/);
    expect(blockMatch?.[1]).toBeDefined();
    const inner = blockMatch![1];

    // Pull every quoted URL.
    const found = Array.from(inner.matchAll(/"(https:\/\/[^"]+)"/g)).map(
      (m) => m[1],
    );
    expect(new Set(found)).toEqual(ALLOWED_SCOPES);
  });

  it("the OAuth module refuses every forbidden broader scope", () => {
    for (const banned of FORBIDDEN_BROADER_SCOPES) {
      expect(oauthSrc).not.toContain(`"${banned}"`);
    }
  });

  it("no file under src/ requests an OAuth scope we don't audit here", () => {
    // Any literal `googleapis.com/auth/<x>` URL in source must appear in
    // ALLOWED_SCOPES OR be a documented test fixture / OAuth callback
    // doc comment.  The whitelist is hard — drift triggers the test.
    const offenders: Array<{ file: string; scope: string }> = [];
    for (const file of walk("src", [".ts", ".tsx"])) {
      if (/__tests__|\.test\.|\.spec\./.test(file)) continue;
      const src = readFileSync(resolve(ROOT, file), "utf8");
      const matches = Array.from(
        src.matchAll(/https:\/\/www\.googleapis\.com\/auth\/[a-z.-]+/g),
      );
      for (const m of matches) {
        const scope = m[0];
        if (ALLOWED_SCOPES.has(scope)) continue;
        offenders.push({ file, scope });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("calendar.events scope is sufficient for both read AND insert paths", () => {
    // Defence-in-depth: pin the actual call sites so a future PR
    // adding a calendar list/metadata read can't sneak past without
    // updating the scope set.
    const calendarSync = readFileSync(
      resolve(ROOT, "src/lib/calendar/sync.ts"),
      "utf8",
    );
    // Only the primary calendar's events endpoint should be touched.
    const endpoints = Array.from(
      calendarSync.matchAll(
        /https:\/\/www\.googleapis\.com\/calendar\/v3\/[a-z/]+/g,
      ),
    ).map((m) => m[0]);
    for (const endpoint of endpoints) {
      expect(endpoint).toMatch(
        /https:\/\/www\.googleapis\.com\/calendar\/v3\/calendars\/primary\/events/,
      );
    }
    // gmail.readonly is sufficient for the readonly endpoints used.
    const gmailSync = readFileSync(
      resolve(ROOT, "src/lib/gmail/sync.ts"),
      "utf8",
    );
    // The only Gmail endpoints touched are `users/me/messages` for
    // listing (`?...`) and `users/me/messages/<id>?format=full` for
    // fetching. Both are readonly. Pin the prefix so any future call
    // to a write endpoint (e.g. `/users/me/messages/send`) fails the
    // greedy match.
    const gmailEndpoints = Array.from(
      gmailSync.matchAll(/https:\/\/gmail\.googleapis\.com\/gmail\/v1[^\s`'")]+/g),
    ).map((m) => m[0]);
    expect(gmailEndpoints.length).toBeGreaterThan(0);
    for (const endpoint of gmailEndpoints) {
      // Allow either the list endpoint or the message-detail endpoint.
      expect(endpoint).toMatch(
        /\/gmail\/v1\/users\/me\/messages(\?|\/[^/?]+\?format=full)/,
      );
    }
    // Defence-in-depth: explicit deny against known write paths.
    expect(gmailSync).not.toContain("messages/send");
    expect(gmailSync).not.toContain("messages/batchModify");
    expect(gmailSync).not.toContain("drafts");
  });
});
