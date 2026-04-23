/**
 * Greenhouse public boards API adapter.
 *
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/<board_token>/jobs
 * No auth. Response schema is documented by Greenhouse; we coerce defensively
 * because third-party schemas drift.
 */
import type {
  SourceFetchOptions,
  SourceFetchResult,
  SourceJob,
} from "../types";

interface GreenhouseJob {
  id?: number;
  title?: string;
  absolute_url?: string;
  content?: string;
  updated_at?: string;
  location?: { name?: string } | null;
  departments?: Array<{ name?: string }> | null;
}

interface GreenhouseBoardResponse {
  jobs?: GreenhouseJob[];
}

const MAX_DESCRIPTION = 8_000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGreenhouseJob(
  raw: GreenhouseJob,
  boardToken: string
): SourceJob | null {
  if (!raw.id || !raw.title || !raw.absolute_url) return null;
  const description = raw.content ? stripHtml(raw.content) : "";
  if (description.length < 20) return null;
  return {
    sourceName: "greenhouse",
    sourceId: `greenhouse:${boardToken}:${raw.id}`,
    company: boardToken,
    role: raw.title.trim().slice(0, 160),
    url: raw.absolute_url,
    location: raw.location?.name?.trim() ?? null,
    department: raw.departments?.[0]?.name?.trim() ?? null,
    description: description.slice(0, MAX_DESCRIPTION),
    postedAt: raw.updated_at ?? null,
  };
}

export async function fetchGreenhouseBoard(
  boardToken: string,
  options: SourceFetchOptions = {}
): Promise<SourceFetchResult> {
  const { limit = 50, signal } = options;
  const warnings: string[] = [];
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    boardToken
  )}/jobs?content=true`;

  let data: GreenhouseBoardResponse;
  try {
    const res = await fetch(url, {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      warnings.push(`greenhouse:${boardToken} — HTTP ${res.status}`);
      return { source: "greenhouse", jobs: [], warnings };
    }
    data = (await res.json()) as GreenhouseBoardResponse;
  } catch (err) {
    warnings.push(
      `greenhouse:${boardToken} — fetch failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { source: "greenhouse", jobs: [], warnings };
  }

  const raws = Array.isArray(data.jobs) ? data.jobs : [];
  const jobs: SourceJob[] = [];
  for (const raw of raws) {
    const parsed = parseGreenhouseJob(raw, boardToken);
    if (parsed) {
      jobs.push(parsed);
      if (jobs.length >= limit) break;
    }
  }

  if (raws.length > 0 && jobs.length === 0) {
    warnings.push(
      `greenhouse:${boardToken} — ${raws.length} raw rows, none parseable`
    );
  }

  return { source: "greenhouse", jobs, warnings };
}
