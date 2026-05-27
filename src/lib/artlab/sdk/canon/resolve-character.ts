// src/lib/artlab/sdk/canon/resolve-character.ts
import type { ArtLabCharacterCanon } from "./character-schema";

export type ResolveCanonCharacterLog = (entry: {
  level: "info";
  event: "canon-roleslug-fallback";
  idOrRoleSlug: string;
  resolvedHeaderId: string;
  resolvedRoleSlug: string;
}) => void;

export interface ResolveCanonCharacterOptions {
  log?: ResolveCanonCharacterLog;
}

/**
 * Find a canon character by either its `header.id` (the canonical record
 * key, e.g. `"sol-navarro"`) or its `roleSlug` (the runtime-facing short
 * slug, e.g. `"cno"`). Runtime callers identify characters by their
 * roleSlug, while canon records are keyed by header.id — this helper
 * bridges the two without forcing every call site to know about both.
 *
 * Lookup order:
 *   1. Try `c.header.id === idOrRoleSlug`. If hit, return immediately.
 *   2. Otherwise try `c.roleSlug === idOrRoleSlug`. If hit, emit a single
 *      INFO log via `options.log` (so we can observe how often callers
 *      rely on the fallback in production) and return.
 *   3. If both miss, return `undefined`.
 *
 * The header.id pass wins even when another character's roleSlug would
 * also match the input — this keeps behavior deterministic when slug
 * spaces accidentally overlap.
 */
export function resolveCanonCharacter(
  canonChars: readonly ArtLabCharacterCanon[],
  idOrRoleSlug: string,
  options?: ResolveCanonCharacterOptions,
): ArtLabCharacterCanon | undefined {
  const byHeaderId = canonChars.find((c) => c.header.id === idOrRoleSlug);
  if (byHeaderId) return byHeaderId;

  const byRoleSlug = canonChars.find((c) => c.roleSlug === idOrRoleSlug);
  if (byRoleSlug) {
    options?.log?.({
      level: "info",
      event: "canon-roleslug-fallback",
      idOrRoleSlug,
      resolvedHeaderId: byRoleSlug.header.id,
      resolvedRoleSlug: byRoleSlug.roleSlug,
    });
    return byRoleSlug;
  }

  return undefined;
}
