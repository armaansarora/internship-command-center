/**
 * R10.3 — parseOfferEmail
 *
 * Best-effort structured extraction from an already-classified offer email.
 * Regex-driven for speed + determinism. Failed extractions return null — the
 * caller surfaces a "couldn't parse, enter manually" path in the Penthouse.
 *
 * Do NOT invoke the LLM here. LLM parsing is scope creep for MVP and
 * introduces latency/cost into the ingest hot path.
 */

export interface ParsedOffer {
  companyName: string;
  role: string;
  level: string | null;
  location: string;
  base: number;
  bonus: number;
  equity: number;
  signOn: number;
  housing: number;
  startDate: string | null; // ISO date YYYY-MM-DD
  deadlineAt: string | null; // ISO date YYYY-MM-DD
}

/**
 * Scan `body` for `${key}...$?<digits with optional commas>`, returning the
 * first match as a plain integer. Returns 0 when no key from `keys` matches.
 * Keys are tried in order so more-specific phrases win (e.g. "base salary"
 * before "salary").
 *
 * Uses non-greedy whitespace/punctuation consumption between key and digits
 * so a `$`-less number like "Base salary: 200,000" is matched correctly
 * (greedy `{0,40}` would backtrack into the number itself).
 */
function pickDollar(body: string, keys: string[]): number {
  for (const k of keys) {
    const re = new RegExp(
      `${k}[^\\n\\d]{0,40}?\\$?([0-9][0-9,]*)`,
      "i",
    );
    const m = re.exec(body);
    if (m) return Number(m[1].replace(/,/g, ""));
  }
  return 0;
}

/**
 * Extract the short value segment that follows `${key}:`. Stops at the next
 * newline, clips to 100 chars, and trims. Returns null if no match.
 */
function pickLine(body: string, key: string): string | null {
  const re = new RegExp(`${key}\\s*:?\\s*([^\\n]{1,100})`, "i");
  const m = re.exec(body);
  return m ? m[1].trim() : null;
}

/**
 * Parse a human-ish date string ("June 1, 2026", "2026-05-01", etc.) into
 * an ISO date (YYYY-MM-DD). Returns null for empty input or unparseable strings.
 */
function parseDateLoose(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function parseOfferEmail(input: {
  subject: string;
  body: string;
}): Promise<ParsedOffer | null> {
  const body = input.body;
  const companyRaw = pickLine(body, "company");
  const companyName = companyRaw ? companyRaw.replace(/[,.]$/, "") : null;
  const base = pickDollar(body, ["base salary", "base", "salary"]);
  if (!companyName || base === 0) return null;

  const role =
    pickLine(body, "role") ??
    pickLine(body, "position") ??
    "Unspecified role";
  const location = pickLine(body, "location") ?? "Unspecified";
  const level = pickLine(body, "level");
  const signOn = pickDollar(body, ["signing bonus", "sign[- ]on"]);
  const equity = pickDollar(body, ["equity", "rsu", "stock"]);
  const bonus = pickDollar(body, ["annual bonus", "bonus"]);
  const housing = pickDollar(body, ["housing stipend", "housing"]);
  const startDateRaw =
    pickLine(body, "start date") ?? pickLine(body, "start");
  const deadlineRaw =
    pickLine(body, "deadline") ?? pickLine(body, "respond by");

  return {
    companyName,
    role,
    level,
    location,
    base,
    bonus,
    equity,
    signOn,
    housing,
    startDate: parseDateLoose(startDateRaw),
    deadlineAt: parseDateLoose(deadlineRaw),
  };
}
