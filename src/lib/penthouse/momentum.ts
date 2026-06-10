/**
 * Momentum math for the Penthouse — pure functions over daily_snapshots rows.
 *
 * Snapshots are point-in-time cumulative counts written once per day by the
 * briefing cron, so momentum is the first difference across the window:
 * "what moved since the start of the window", not a sum of daily increments.
 */

export interface SnapshotPoint {
  /** YYYY-MM-DD */
  date: string;
  totalApplications: number;
  activePipeline: number;
  appliedCount: number;
  interviewCount: number;
  offerCount: number;
  staleCount: number;
}

export type MomentumDirection = "rising" | "steady" | "cooling";

export interface MomentumSummary {
  /** Ascending by date, deduped — what the chart renders. */
  points: SnapshotPoint[];
  /** Applications added across the window (clamped ≥ 0). */
  appsAdded: number;
  /** Active-pipeline movement: last − first. Negative = cooling. */
  pipelineDelta: number;
  /** Interview-stage movement: last − first. */
  interviewDelta: number;
  direction: MomentumDirection;
  /** False below 2 points — the widget renders its empty state instead. */
  hasEnoughData: boolean;
  /** Window bounds for the caption (empty strings when no data). */
  firstDate: string;
  lastDate: string;
}

const EMPTY: MomentumSummary = {
  points: [],
  appsAdded: 0,
  pipelineDelta: 0,
  interviewDelta: 0,
  direction: "steady",
  hasEnoughData: false,
  firstDate: "",
  lastDate: "",
};

/**
 * Movement beats volume: any forward motion in pipeline or interviews reads
 * as rising; pure shrinkage reads as cooling; everything else is steady.
 */
export function classifyDirection(pipelineDelta: number, interviewDelta: number): MomentumDirection {
  if (pipelineDelta > 0 || interviewDelta > 0) return "rising";
  if (pipelineDelta < 0) return "cooling";
  return "steady";
}

export function computeMomentum(rows: SnapshotPoint[]): MomentumSummary {
  if (rows.length === 0) return EMPTY;

  // Dedupe by date (last write wins) and sort ascending.
  const byDate = new Map<string, SnapshotPoint>();
  for (const r of rows) byDate.set(r.date, r);
  const points = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  if (points.length < 2) {
    return { ...EMPTY, points, firstDate: points[0]?.date ?? "", lastDate: points[0]?.date ?? "" };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const appsAdded = Math.max(0, last.totalApplications - first.totalApplications);
  const pipelineDelta = last.activePipeline - first.activePipeline;
  const interviewDelta = last.interviewCount - first.interviewCount;

  return {
    points,
    appsAdded,
    pipelineDelta,
    interviewDelta,
    direction: classifyDirection(pipelineDelta, interviewDelta),
    hasEnoughData: true,
    firstDate: first.date,
    lastDate: last.date,
  };
}
