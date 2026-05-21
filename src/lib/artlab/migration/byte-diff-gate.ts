// src/lib/artlab/migration/byte-diff-gate.ts
import { join } from "node:path";
import { snapshotPromotedState, comparePromotedStateSnapshots, type PromotedStateSnapshot } from "./promoted-state-snapshot";

export interface ByteDiffGateInput {
  publicArtRoot: string;
  baseline: { otis: PromotedStateSnapshot; ceo: PromotedStateSnapshot } | null;
}

export interface ByteDiffGateResult {
  passed: boolean;
  snapshot: { otis: PromotedStateSnapshot; ceo: PromotedStateSnapshot };
  diff?: { added: PromotedStateSnapshot["entries"]; removed: PromotedStateSnapshot["entries"]; changed: { path: string; before: string; after: string }[] };
}

export async function assertByteIdenticalPromotedState(input: ByteDiffGateInput): Promise<ByteDiffGateResult> {
  const currentOtis = await snapshotPromotedState({ rootDir: join(input.publicArtRoot, "lobby", "otis") });
  const currentCeo = await snapshotPromotedState({ rootDir: join(input.publicArtRoot, "penthouse", "ceo") });
  const snapshot = { otis: currentOtis, ceo: currentCeo };
  if (!input.baseline) return { passed: true, snapshot };
  const diffOtis = comparePromotedStateSnapshots(input.baseline.otis, currentOtis);
  const diffCeo = comparePromotedStateSnapshots(input.baseline.ceo, currentCeo);
  const totalDiff = {
    added: [...diffOtis.added, ...diffCeo.added],
    removed: [...diffOtis.removed, ...diffCeo.removed],
    changed: [...diffOtis.changed, ...diffCeo.changed],
  };
  const passed = totalDiff.added.length === 0 && totalDiff.removed.length === 0 && totalDiff.changed.length === 0;
  return { passed, snapshot, diff: totalDiff };
}
