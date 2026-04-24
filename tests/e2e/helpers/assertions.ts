/**
 * Bytewise scan of a response body for any of a set of forbidden strings.
 * Used by cross-user leak scenarios — asserts user A's view bytewise
 * contains zero of user B's row IDs, anon-keys, or PII. Returns a tagged
 * union so callers can surface a precise error message.
 */
export function assertNoneAppear(
  body: string,
  forbiddenStrings: string[],
): { ok: true } | { ok: false; found: string } {
  for (const forbidden of forbiddenStrings) {
    if (body.includes(forbidden)) {
      return { ok: false, found: forbidden };
    }
  }
  return { ok: true };
}
