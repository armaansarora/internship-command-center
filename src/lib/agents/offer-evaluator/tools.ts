/**
 * Offer Evaluator tools (intentionally empty).
 *
 * The Evaluator works from the offer row + comp-band snapshot the caller
 * resolves BEFORE invoking `generateObject`. It does not fetch anything of
 * its own — no DB calls, no network, no side effects. Keeping tools empty
 * and the prompt tight is load-bearing: we want a single structured reply
 * from the first model round-trip, not a tool-calling loop.
 */
export function buildOfferEvaluatorTools(): Record<string, never> {
  return {};
}
