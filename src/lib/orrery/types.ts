/**
 * R9.1 — Typed contract for the Observatory's Orrery.
 *
 * This is the swap-ready boundary between data and render. R9.2 ships a
 * CSS 3D renderer that consumes `OrreryPlanet[]`; an eventual R3F port
 * will consume the same shape unchanged. Anything the render layer needs
 * to draw a frame must live on `OrreryPlanet` so render never re-queries.
 */

export type Tier = 1 | 2 | 3 | 4;

export type Status =
  | "discovered"
  | "applied"
  | "screening"
  | "interview_scheduled"
  | "interviewing"
  | "under_review"
  | "offer"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface OrreryPlanet {
  id: string;
  label: string;
  role: string;
  tier: Tier;
  status: Status;
  /** Polar position. radius is mode-derived; angleDeg is hash-stable. */
  radius: number;
  angleDeg: number;
  /** Visual signals */
  sizePx: number;
  colorToken: string;
  /** Behavior signals */
  hasSatellite: boolean;
  isSupernova: boolean;
  isFading: boolean;
  /** History context (for the detail panel; render layer ignores) */
  matchScore: number | null;
  appliedAt: string | null;
  lastActivityAt: string | null;
}

export type PatternMode = "stage" | "tier" | "velocity";

export interface ApplicationInput {
  id: string;
  companyName: string;
  role: string;
  /** DB allows null/anything; the transformer clamps out-of-range to 4. */
  tier: number | null;
  status: Status;
  matchScore: number | null;
  appliedAt: string | null;
  lastActivityAt: string | null;
  /**
   * Whether THIS user has ever had a planet at offer status before — passed
   * by the caller (server-fetched separately). When true we suppress
   * supernova for this run so the effect fires exactly once per lifetime.
   */
  hasOfferEverFired: boolean;
}
