import { describe, expect, it } from "vitest";
import {
  FOUNDRY_SLOT_REGISTRY,
  isFoundrySlotRegistered,
  resolveFoundrySlot,
  registerFoundrySlot,
  type FoundrySlotRecord,
} from "./slot-registry";

describe("FOUNDRY_SLOT_REGISTRY", () => {
  it("contains the Otis lobby slot", () => {
    expect(FOUNDRY_SLOT_REGISTRY.some((s) => s.slotId === "lobby/otis/regular/idle")).toBe(true);
  });

  it("contains a slot pattern for every promoted character outfit+pose", () => {
    const characterSlots = FOUNDRY_SLOT_REGISTRY.filter((s) => s.kind === "character-sprite");
    expect(characterSlots.length).toBeGreaterThanOrEqual(42);
  });

  it("isFoundrySlotRegistered returns true for a known slot", () => {
    expect(isFoundrySlotRegistered("lobby/otis/regular/idle")).toBe(true);
  });

  it("isFoundrySlotRegistered returns false for a rogue slot", () => {
    expect(isFoundrySlotRegistered("lobby/intruder/rogue")).toBe(false);
  });

  it("resolveFoundrySlot returns the slot record", () => {
    const slot = resolveFoundrySlot("lobby/otis/regular/idle");
    expect(slot?.appPath).toBe("public/art/lobby/otis/regular/idle.webp");
    expect(slot?.kind).toBe("character-sprite");
  });

  it("registerFoundrySlot adds a new dynamic slot", () => {
    registerFoundrySlot({
      slotId: "floors/7/background/main",
      appPath: "public/floors/7/background/main.webp",
      kind: "floor-environment",
      component: "WarRoomBackground",
      requiresGsap: true,
    });
    expect(isFoundrySlotRegistered("floors/7/background/main")).toBe(true);
  });

  it("registerFoundrySlot rejects a duplicate slot id", () => {
    expect(() =>
      registerFoundrySlot({
        slotId: "lobby/otis/regular/idle",
        appPath: "public/art/lobby/otis/regular/idle.webp",
        kind: "character-sprite",
        component: "OtisCharacter",
        requiresGsap: false,
      }),
    ).toThrow();
  });

  describe("registerFoundrySlot appPath path-traversal hardening", () => {
    // Reviewer Critical 1 — slot-registry previously trusted the appPath
    // verbatim, so a rogue registration could later satisfy
    // `validateFoundryManifestAgainstSlots` for a manifest pointing at
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
          registerFoundrySlot({
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

  describe("registerFoundrySlot kind enum hardening", () => {
    it("rejects a slot whose kind is not in FOUNDRY_ASSET_KINDS", () => {
      expect(() =>
        registerFoundrySlot({
          slotId: "dynamic/test/bad-kind",
          appPath: "public/art/dynamic/bad-kind.webp",
          // Deliberately invalid kind smuggled past the structural type via cast.
          kind: "rootkit" as unknown as FoundrySlotRecord["kind"],
          component: null,
          requiresGsap: false,
        }),
      ).toThrow(/kind/);
    });
  });
});
