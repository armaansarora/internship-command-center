/**
 * Normalized Job shape — every source (Greenhouse, Lever, seed, future) adapts
 * to this shape so the scorer, deduper, and ingester never care where the job
 * came from.
 */
export type SourceName = "greenhouse" | "lever" | "seed";

export interface SourceJob {
  /** Which adapter produced this row. */
  sourceName: SourceName;
  /** Stable identifier within that source — used for dedupe + provenance. */
  sourceId: string;
  /** Company board slug / org name as the source reports it. */
  company: string;
  /** Cleaned role title (max 160 chars). */
  role: string;
  /** Canonical job URL. */
  url: string;
  /** Free-text location string (source-provided). Nullable. */
  location: string | null;
  /** Free-text department / team. Nullable. */
  department: string | null;
  /** Full job description (plain text). Primary embedding input. */
  description: string;
  /** ISO timestamp of last update at the source. Nullable. */
  postedAt: string | null;
}

export interface SourceFetchOptions {
  /** Per-source soft cap. Adapters return at most this many rows. */
  limit?: number;
  /** Abort signal — pass from an ingester with a timebox. */
  signal?: AbortSignal;
}

export interface SourceFetchResult {
  source: SourceName;
  jobs: SourceJob[];
  /** Non-fatal warnings (bad row, unknown shape). */
  warnings: string[];
}
