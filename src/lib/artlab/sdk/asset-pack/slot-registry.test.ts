import { describe, expect, it } from "vitest";
import {
  ARTLAB_SLOT_REGISTRY,
  isArtLabSlotRegistered,
  resolveArtLabSlot,
  registerArtLabSlot,
  type ArtLabSlotRecord,
} from "./slot-registry";

describe("ARTLAB_SLOT_REGISTRY", () => {
  it("contains the Otis lobby slot", () => {
    expect(ARTLAB_SLOT_REGISTRY.some((s) => s.slotId === "lobby/otis/regular/idle")).toBe(true);
  });

  it("contains a slot pattern for every promoted character outfit+pose", () => {
    const characterSlots = ARTLAB_SLOT_REGISTRY.filter((s) => s.kind === "character-sprite");
    expect(characterSlots.length).toBeGreaterThanOrEqual(42);
  });

  it("isArtLabSlotRegistered returns true for a known slot", () => {
    expect(isArtLabSlotRegistered("lobby/otis/regular/idle")).toBe(true);
  });

  it("isArtLabSlotRegistered returns false for a rogue slot", () => {
    expect(isArtLabSlotRegistered("lobby/intruder/rogue")).toBe(false);
  });

  it("resolveArtLabSlot returns the slot record", () => {
    const slot = resolveArtLabSlot("lobby/otis/regular/idle");
    expect(slot?.appPath).toBe("public/art/lobby/otis/regular/idle.webp");
    expect(slot?.kind).toBe("character-sprite");
  });

  it("registerArtLabSlot adds a new dynamic slot", () => {
    registerArtLabSlot({
      slotId: "floors/7/background/main",
      appPath: "public/floors/7/background/main.webp",
      kind: "floor-environment",
      component: "WarRoomBackground",
      requiresGsap: true,
    });
    expect(isArtLabSlotRegistered("floors/7/background/main")).toBe(true);
  });

  it("registerArtLabSlot rejects a duplicate slot id", () => {
    expect(() =>
      registerArtLabSlot({
        slotId: "lobby/otis/regular/idle",
        appPath: "public/art/lobby/otis/regular/idle.webp",
        kind: "character-sprite",
        component: "OtisCharacter",
        requiresGsap: false,
      }),
    ).toThrow();
  });

  describe("registerArtLabSlot appPath path-traversal hardening", () => {
    // Reviewer Critical 1 — slot-registry previously trusted the appPath
    // verbatim, so a rogue registration could later satisfy
    // `validateArtLabManifestAgainstSlots` for a manifest pointing at
    // `../../etc/passwd`. Same attack vectors used by manifest.schema.test.ts.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["literal traversal", "../../etc/passwd"],
      ["url-encoded ..", "public/..%2fetc/passwd"],
      ["url-encoded dots inside a segment", "public/foo/%2e%2e/bar"],
      ["fully encoded ..", "public/%2e%2e/etc/passwd"],
      ["leading double slash", "public//etc/passwd"],
      ["backslash separator", "public\\..\\etc\\passwd"],
      ["mixed slash + backslash", "public/foo\\..\\bar"],
      ["NUL byte injection", "public/idle.webp\0.png"],
      ["leading slash (absolute path)", "/etc/passwd"],
      ["tilde (home expansion)", "~/secret"],
      ["windows drive prefix", "C:/Windows/System32"],
      ["normalises outside allow-list", "public/../src/secret"],
      ["dot segment that escapes via current dir", "public/./../../etc/passwd"],
      ["empty path", ""],
      ["unlisted prefix (top-level dir)", "etc/passwd"],
      ["unlisted prefix (src not in allow-list)", "src/server/secret.ts"],
    ];

    for (const [label, appPath] of cases) {
      it(`rejects slot registration with appPath: ${label}`, () => {
        expect(() =>
          registerArtLabSlot({
            slotId: `dynamic/test/${label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
            appPath,
            kind: "ui-icon",
            component: null,
            requiresGsap: false,
          }),
        ).toThrow(/appPath/);
      });
    }
  });

  describe("registerArtLabSlot kind enum hardening", () => {
    it("rejects a slot whose kind is not in ARTLAB_ASSET_KINDS", () => {
      expect(() =>
        registerArtLabSlot({
          slotId: "dynamic/test/bad-kind",
          appPath: "public/art/dynamic/bad-kind.webp",
          // Deliberately invalid kind smuggled past the structural type via cast.
          kind: "rootkit" as unknown as ArtLabSlotRecord["kind"],
          component: null,
          requiresGsap: false,
        }),
      ).toThrow(/kind/);
    });
  });
});
