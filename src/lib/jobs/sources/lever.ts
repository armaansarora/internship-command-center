/**
 * Lever public postings API adapter.
 *
 * Endpoint: https://api.lever.co/v0/postings/<account>?mode=json
 * No auth. Docs: https://github.com/lever/postings-api
 */
import type {
  SourceFetchOptions,
  SourceFetchResult,
  SourceJob,
} from "../types";

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  descriptionPlain?: string;
  description?: string;
  createdAt?: number;
  categories?: {
    team?: string;
    location?: string;
    commitment?: string;
  } | null;
}

const MAX_DESCRIPTION = 8_000;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLeverPosting(
  raw: LeverPosting,
  account: string
): SourceJob | null {
  if (!raw.id || !raw.text || !raw.hostedUrl) return null;
  const description =
    (raw.descriptionPlain && raw.descriptionPlain.trim()) ||
    (raw.description ? stripHtml(raw.description) : "");
  if (!description || description.length < 20) return null;
  return {
    sourceName: "lever",
    sourceId: `lever:${account}:${raw.id}`,
    company: account,
    role: raw.text.trim().slice(0, 160),
    url: raw.hostedUrl,
    location: raw.categories?.location?.trim() ?? null,
    department: raw.categories?.team?.trim() ?? null,
    description: description.slice(0, MAX_DESCRIPTION),
    postedAt:
      typeof raw.createdAt === "number"
        ? new Date(raw.createdAt).toISOString()
        : null,
  };
}

export async function fetchLeverAccount(
  account: string,
  options: SourceFetchOptions = {}
): Promise<SourceFetchResult> {
  const { limit = 50, signal } = options;
  const warnings: string[] = [];
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(
    account
  )}?mode=json`;

  let data: LeverPosting[];
  try {
    const res = await fetch(url, {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      warnings.push(`lever:${account} — HTTP ${res.status}`);
      return { source: "lever", jobs: [], warnings };
    }
    data = (await res.json()) as LeverPosting[];
  } catch (err) {
    warnings.push(
      `lever:${account} — fetch failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { source: "lever", jobs: [], warnings };
  }

  const raws = Array.isArray(data) ? data : [];
  const jobs: SourceJob[] = [];
  for (const raw of raws) {
    const parsed = parseLeverPosting(raw, account);
    if (parsed) {
      jobs.push(parsed);
      if (jobs.length >= limit) break;
    }
  }

  if (raws.length > 0 && jobs.length === 0) {
    warnings.push(
      `lever:${account} — ${raws.length} raw rows, none parseable`
    );
  }

  return { source: "lever", jobs, warnings };
}
