import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R8 P9 — consent copy drift guard.
 *
 * The single source of truth for consent language is
 * `docs/r8/consent-copy.md`.  `NetworkingConsent.tsx` renders that copy
 * verbatim.  If either drifts from the other without a coordinated
 * `networking_consent_version` bump, this test fails and the phase
 * acceptance gate blocks.
 *
 * We grep-check for a handful of canary sentences that must appear
 * in BOTH the markdown and the component source.  Any edit that
 * touches one must touch the other.
 */
const DOC_PATH = resolve(process.cwd(), "docs/r8/consent-copy.md");
const COMPONENT_PATH = resolve(
  process.cwd(),
  "src/components/settings/NetworkingConsent.tsx",
);

const CANARIES: RegExp[] = [
  /Warm Intro Network/,
  /The Warm Intro Network connects you/,
  /by name and target company only/,
  /Your contacts, your messages, your cover letters, your interview notes, your private sticky-notes/,
  /Revoking is instant/,
  /Anyone else['`’]s data with you unless they['`’]ve also opted in/,
];

describe("R8 P9 — consent copy drift guard", () => {
  it("docs/r8/consent-copy.md exists and contains every canary", () => {
    const body = readFileSync(DOC_PATH, "utf8");
    for (const canary of CANARIES) {
      expect(body).toMatch(canary);
    }
  });

  it("NetworkingConsent.tsx contains every canary verbatim", () => {
    const body = readFileSync(COMPONENT_PATH, "utf8");
    for (const canary of CANARIES) {
      expect(body).toMatch(canary);
    }
  });

  it("opt-in POST route exists", async () => {
    const mod = await import("@/app/api/networking/opt-in/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("revoke POST route exists and clears networking_match_index", async () => {
    const mod = await import("@/app/api/networking/revoke/route");
    expect(typeof mod.POST).toBe("function");
    const body = readFileSync(
      resolve(process.cwd(), "src/app/api/networking/revoke/route.ts"),
      "utf8",
    );
    expect(body).toContain("networking_match_index");
    expect(body).toMatch(/\.delete\(\)/);
  });
});
