/**
 * Firecrawl client for Levels.fyi scraping.
 *
 * Direct HTTP against Firecrawl's /v1/scrape endpoint — no npm dep. We parse
 * the returned markdown with a focused regex set (NOT a full HTML parser).
 * If Levels.fyi's layout shifts dramatically, the regex breaks NOISILY and
 * we return null → graceful-empty UI. Fix-forward policy: never silently
 * fabricate bands when the parse fails.
 *
 * Env: FIRECRAWL_API_KEY. Unset → return null (caller short-circuits the
 * entire flow and returns {ok:false, reason:"no_key"} to the UI).
 *
 * The budget counter is managed upstream in `lookupCompBands` — this module
 * is unaware of the budget and never reads/writes `comp_bands_budget`.
 */

export interface CompBandsScrape {
  basePercentiles: { p25: number; p50: number; p75: number };
  bonusPercentiles: { p25: number; p50: number; p75: number };
  equityPercentiles: { p25: number; p50: number; p75: number };
  sampleSize: number;
}

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";

/**
 * Build the canonical Levels.fyi salaries URL for the given (company, role,
 * location) triple. Company + role are slugged into the path; location
 * survives as a query param (Levels.fyi honors both formats).
 */
export function buildLevelsFyiUrl(input: {
  company: string;
  role: string;
  location: string;
}): string {
  const slug = (s: string): string =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `https://www.levels.fyi/companies/${slug(input.company)}/salaries/${slug(input.role)}?location=${encodeURIComponent(input.location)}`;
}

/**
 * Strip commas / currency symbols / whitespace and coerce to a plain integer.
 * Empty or undefined input → 0.
 */
function parseIntFromString(s: string | undefined): number {
  if (!s) return 0;
  return Number(s.replace(/[^0-9]/g, ""));
}

/**
 * Scan the markdown for a `header`-anchored run of three numeric capture
 * groups separated by at most 80/40/40 non-digit characters. Matches
 * formats like:
 *   "25th percentile: $180,000 Median: $220,000 75th percentile: $280,000"
 *   "Bonus: 25,000 / 40,000 / 60,000"
 *   "Equity: 80000 / 120000 / 200000"
 * Returns {0,0,0} if no match (caller decides whether to fall back).
 */
function matchTriple(
  markdown: string,
  header: RegExp,
): { p25: number; p50: number; p75: number } {
  // Each comp number requires >=3 digits so we don't capture percentile
  // labels like "25th" or "75th" as if they were dollar amounts. The gaps
  // between numbers allow all non-digit characters plus short digit runs
  // (up to 2 digits) — this lets the parser skip over label digits like
  // "75th percentile" and land on the actual comp figure that follows.
  //
  // The three numeric captures are NAMED (p25/p50/p75) so callers that pass
  // a regex with its own capturing group don't shift our indices.
  const gap = "(?:[^\\d]|\\d{1,2}(?!\\d))";
  const re = new RegExp(
    `(?:${header.source})${gap}{0,120}(?<p25>[0-9][0-9,]{2,})${gap}{0,80}(?<p50>[0-9][0-9,]{2,})${gap}{0,80}(?<p75>[0-9][0-9,]{2,})`,
    "i",
  );
  const m = re.exec(markdown);
  if (!m?.groups) return { p25: 0, p50: 0, p75: 0 };
  return {
    p25: parseIntFromString(m.groups.p25),
    p50: parseIntFromString(m.groups.p50),
    p75: parseIntFromString(m.groups.p75),
  };
}

/**
 * Scrape a single Levels.fyi salaries page via Firecrawl. Returns a
 * normalized CompBandsScrape on success, or null on any of:
 *   - FIRECRAWL_API_KEY missing
 *   - Firecrawl HTTP error (non-2xx)
 *   - Network/JSON parse failure
 *   - Markdown too short / has no dollar amounts
 *   - All three base percentiles are zero (no base-comp data recoverable)
 */
export async function scrapeLevelsFyi(
  company: string,
  role: string,
  location: string,
): Promise<CompBandsScrape | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  let res: Response;
  try {
    res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: buildLevelsFyiUrl({ company, role, location }),
        formats: ["markdown"],
      }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let payload: { data?: { markdown?: string } };
  try {
    payload = (await res.json()) as { data?: { markdown?: string } };
  } catch {
    return null;
  }
  const markdown = payload.data?.markdown ?? "";
  if (markdown.length < 50 || !/\$[0-9]/.test(markdown)) return null;

  const baseTriple = matchTriple(markdown, /(25th|p25|base)/i);
  if (!baseTriple.p50) {
    const medianMatch = /median[^\d$]*\$?([0-9,]+)/i.exec(markdown);
    if (medianMatch) baseTriple.p50 = parseIntFromString(medianMatch[1]);
  }
  if (!baseTriple.p25) {
    const p25Match = /25th[^\d$]*\$?([0-9,]+)/i.exec(markdown);
    if (p25Match) baseTriple.p25 = parseIntFromString(p25Match[1]);
  }
  if (!baseTriple.p75) {
    const p75Match = /75th[^\d$]*\$?([0-9,]+)/i.exec(markdown);
    if (p75Match) baseTriple.p75 = parseIntFromString(p75Match[1]);
  }

  if (!baseTriple.p25 && !baseTriple.p50 && !baseTriple.p75) return null;

  const bonus = matchTriple(markdown, /bonus/i);
  const equity = matchTriple(markdown, /(equity|rsu|stock)/i);
  const sizeMatch = /sample\s*size\s*:?\s*([0-9,]+)/i.exec(markdown);
  const sampleSize = sizeMatch ? Number(sizeMatch[1].replace(/,/g, "")) : 0;

  return {
    basePercentiles: baseTriple,
    bonusPercentiles: bonus,
    equityPercentiles: equity,
    sampleSize,
  };
}
