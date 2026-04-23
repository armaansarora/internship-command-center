/**
 * Company-tier table — small enough to ship as static data per CHAIN-OF-COMMAND.md §400
 * ("Static context > RAG for <50 items").
 *
 * 1 = top-tier target (Stripe / Anthropic / Ramp class)
 * 2 = strong reputation, well-funded
 * 3 = solid Series B / category-defining
 * 4 = early-stage / lower-signal
 * 5 = unknown (default)
 *
 * Lookup is case-insensitive, first-match-wins on lowered normalized name.
 * Extend this table over time; not a research blocker.
 */
const TIER_MAP: ReadonlyMap<string, number> = new Map([
  ["stripe", 1],
  ["anthropic", 1],
  ["openai", 1],
  ["ramp", 1],
  ["vercel", 1],
  ["linear", 1],
  ["figma", 1],
  ["notion", 1],
  ["databricks", 1],
  ["scale", 1],
  ["scale ai", 1],
  ["nvidia", 1],
  ["google", 1],
  ["meta", 1],
  ["apple", 1],
  ["microsoft", 1],
  ["amazon", 1],
  ["shopify", 2],
  ["airtable", 2],
  ["retool", 2],
  ["mercury", 2],
  ["modal", 2],
  ["cursor", 2],
  ["anysphere", 2],
  ["supabase", 2],
  ["plaid", 2],
  ["hex", 2],
  ["brex", 2],
  ["replit", 2],
  ["deel", 2],
  ["doordash", 2],
  ["airbnb", 2],
  ["robinhood", 2],
  ["snowflake", 2],
  ["atlassian", 2],
  ["gitlab", 2],
  ["cloudflare", 2],
  ["datadog", 2],
  ["mongodb", 2],
  ["uber", 3],
  ["lyft", 3],
  ["twilio", 3],
  ["segment", 3],
  ["hubspot", 3],
  ["zendesk", 3],
  ["palantir", 3],
  ["salesforce", 3],
  ["oracle", 3],
  ["intuit", 3],
  ["block", 3],
  ["square", 3],
  ["paypal", 3],
]);

/**
 * Normalize a company name for lookup — lowercase, trim, collapse whitespace,
 * strip common legal suffixes.
 */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,?\s*(inc|llc|ltd|corp|corporation|co)\.?$/i, "");
}

export function getCompanyTier(company: string): number {
  const normalized = normalizeCompany(company);
  return TIER_MAP.get(normalized) ?? 5;
}

/**
 * Weight applied to cosine-similarity in the job scorer.
 * Tier 1 is a boost; tier 5 (unknown) is a slight drag.
 */
export function tierWeight(tier: number): number {
  switch (tier) {
    case 1:
      return 1.15;
    case 2:
      return 1.08;
    case 3:
      return 1.0;
    case 4:
      return 0.92;
    default:
      return 0.88;
  }
}
