// src/lib/artlab/intake/bundle-acceptance.test.ts
import { describe, expect, it } from "vitest";
import {
  parseBundle,
  enforceAtomicBundle,
  BundleAcceptanceError,
  type BundleSpec,
} from "./bundle-parser";

describe.skip("live spend — Phase 6 bundle acceptance: war room with Rafe", () => {
  it("'make the war room with Rafe in it' parses to a bundle with ≥ 2 children", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();
    expect(bundle!.children.length).toBeGreaterThanOrEqual(2);
    const types = bundle!.children.map((c) => c.assetType);
    expect(types).toContain("environment");
    // Rafe co-appears via either a character reference or a scene asset linked to him
    expect(bundle!.links.some((l) => l.linkType === "co-appears-in" || l.linkType === "references")).toBe(true);
  });

  it("promotionPolicy is 'atomic' for war-room bundles (env + character)", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();
    expect(bundle!.promotionPolicy).toBe("atomic");
  });
});

// -----------------------------------------------------------------------------
// Shape test — exercises the bundle parser + acceptance enforcement on a
// synthetic text fixture. No provider calls, no live spend.
//
// What this catches:
//   - Parser regression: "war room with Rafe" must yield an env + character pair
//     (both atoms, not just one).
//   - Atomic acceptance regression: a corrupted bundle that lacks one of the
//     required asset types must be rejected with the specific
//     `BUNDLE_PARTIAL_ACCEPT` error code, NOT silently accepted.
// -----------------------------------------------------------------------------
describe("shape — bundle parser + atomic acceptance", () => {
  it("produces both environment + character atoms for 'war room with Rafe in it'", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();

    const types = bundle!.children.map((c) => c.assetType);
    expect(types).toContain("environment");
    expect(types).toContain("character");

    const charChild = bundle!.children.find((c) => c.assetType === "character");
    expect(charChild?.characterHint).toBe("Rafe");

    expect(bundle!.promotionPolicy).toBe("atomic");
  });

  it("enforceAtomicBundle accepts a well-formed env+character bundle", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();

    // Should not throw — the bundle has both required asset types.
    expect(() =>
      enforceAtomicBundle(bundle!, ["environment", "character"]),
    ).not.toThrow();
  });

  it("enforceAtomicBundle rejects a partial-accept bundle with BUNDLE_PARTIAL_ACCEPT", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();

    // Deliberately corrupt the bundle: strip the environment child to simulate
    // a partial-accept scenario (would result in a character landing without
    // its scene).
    const corrupted: BundleSpec = {
      ...bundle!,
      children: bundle!.children.filter((c) => c.assetType !== "environment"),
      links: [], // links would now dangle; clear them so we test the missing-type code path specifically
    };

    let captured: unknown = null;
    try {
      enforceAtomicBundle(corrupted, ["environment", "character"]);
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeInstanceOf(BundleAcceptanceError);
    expect((captured as BundleAcceptanceError).code).toBe("BUNDLE_PARTIAL_ACCEPT");
    expect((captured as BundleAcceptanceError).message).toMatch(/environment/);
  });

  it("enforceAtomicBundle rejects an empty atomic bundle with BUNDLE_MISSING_CHILDREN", () => {
    const empty: BundleSpec = {
      bundleId: "synthetic-empty",
      source: "with-in-it",
      children: [],
      promotionPolicy: "atomic",
      links: [],
    };
    let captured: unknown = null;
    try {
      enforceAtomicBundle(empty);
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeInstanceOf(BundleAcceptanceError);
    expect((captured as BundleAcceptanceError).code).toBe("BUNDLE_MISSING_CHILDREN");
  });

  it("enforceAtomicBundle rejects a bundle with dangling links via BUNDLE_LINK_DANGLING", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();

    const corrupted: BundleSpec = {
      ...bundle!,
      links: [
        // Reference a childId that does not exist in `children`.
        { childA: bundle!.children[0]!.childId, childB: "ghost-child-id", linkType: "co-appears-in" },
      ],
    };

    let captured: unknown = null;
    try {
      enforceAtomicBundle(corrupted, ["environment", "character"]);
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeInstanceOf(BundleAcceptanceError);
    expect((captured as BundleAcceptanceError).code).toBe("BUNDLE_LINK_DANGLING");
  });

  it("enforceAtomicBundle is a no-op on 'independent' bundles", () => {
    const bundle = parseBundle("make a button for the war room");
    expect(bundle).not.toBeNull();
    expect(bundle!.promotionPolicy).toBe("independent");
    // Even with required-types specified, independent bundles aren't subject
    // to the atomic-acceptance contract.
    expect(() =>
      enforceAtomicBundle(bundle!, ["environment", "character"]),
    ).not.toThrow();
  });
});
