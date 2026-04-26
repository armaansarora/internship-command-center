/**
 * Situation Map data shaping.
 *
 * Transforms outreach rows into a renderable node + arc graph. The Map's
 * cardinal rule from the R7 brief: **flight paths are earned, not
 * decorative.** An arc is drawn ONLY when a real outreach row warrants it.
 *
 * Node positions are deterministic per company so the same Map renders
 * the same layout across reloads (less visual churn as arcs animate).
 */

export type ArcKind = "active" | "draft" | "completed";

export interface MapNode {
  id: string;        // company id OR "user" for the center node
  label: string;
  angle: number;     // radians, 0..2π (ignored for user node)
  ring: number;      // 0=user, 1=outer
  kind: "user" | "company" | "cluster";
  /** For cluster: number of grouped-in companies. */
  count?: number;
}

export interface MapArc {
  id: string;                  // outreach id
  fromCompanyId: string;       // always connects company↔user; direction implicit from kind
  kind: ArcKind;
  startedAtMs: number;         // for time-based animation progress
}

export interface MapShape {
  user: MapNode;
  companies: MapNode[];        // companies actually placed (up to nodeCeiling)
  cluster: MapNode | null;     // "+N more" cluster when overflow
  arcs: MapArc[];
  activeCount: number;
}

export interface ShapeInput {
  outreach: Array<{
    id: string;
    companyId: string | null;
    status: string;              // 'pending_approval' | 'approved' | 'sent' | ...
    sendAfterMs: number | null;
    approvedAtMs: number | null;
    sentAtMs: number | null;
  }>;
  companies: Array<{
    id: string;
    name: string;
    warmth?: number;             // higher = more recent contact; drives sort when clustering
  }>;
  nowMs: number;
}

const NODE_CEILING = 50;

/** Deterministic hash → angle in [0, 2π). */
function hashToAngle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  // Unsigned mod for negative h
  const n = ((h % 360) + 360) % 360;
  return (n / 360) * 2 * Math.PI;
}

export function shapeOutreachArcs(input: ShapeInput): MapShape {
  const { outreach, companies, nowMs } = input;

  // Keep only arcs we want to draw: active | draft | completed-within-24h
  const arcs: MapArc[] = [];
  for (const o of outreach) {
    if (!o.companyId) continue;
    if (
      o.status === "approved" &&
      o.sendAfterMs !== null &&
      o.sendAfterMs > nowMs
    ) {
      arcs.push({
        id: o.id,
        fromCompanyId: o.companyId,
        kind: "active",
        startedAtMs: o.approvedAtMs ?? nowMs,
      });
    } else if (o.status === "pending_approval") {
      arcs.push({
        id: o.id,
        fromCompanyId: o.companyId,
        kind: "draft",
        startedAtMs: nowMs,
      });
    } else if (
      o.status === "sent" &&
      o.sentAtMs !== null &&
      nowMs - o.sentAtMs < 24 * 60 * 60 * 1000
    ) {
      arcs.push({
        id: o.id,
        fromCompanyId: o.companyId,
        kind: "completed",
        startedAtMs: o.sentAtMs,
      });
    }
  }

  // Which companies have at least one arc?
  const companiesWithArcs = new Set(arcs.map((a) => a.fromCompanyId));
  const relevant = companies.filter((c) => companiesWithArcs.has(c.id));

  // Sort by warmth descending (most active first), ties by id for determinism.
  relevant.sort((a, b) => {
    const aw = a.warmth ?? 50;
    const bw = b.warmth ?? 50;
    if (aw !== bw) return bw - aw;
    return a.id.localeCompare(b.id);
  });

  let placed = relevant;
  let clusterCount = 0;
  if (relevant.length > NODE_CEILING) {
    placed = relevant.slice(0, NODE_CEILING);
    clusterCount = relevant.length - NODE_CEILING;
  }

  const placedIds = new Set(placed.map((c) => c.id));
  // Drop arcs that target clustered-away companies (their arcs roll into the cluster visually, if at all).
  const visibleArcs = arcs.filter((a) => placedIds.has(a.fromCompanyId));

  const companyNodes: MapNode[] = placed.map((c) => ({
    id: c.id,
    label: c.name,
    angle: hashToAngle(c.id),
    ring: 1,
    kind: "company",
  }));

  const cluster: MapNode | null =
    clusterCount > 0
      ? {
          id: "cluster",
          label: `+${clusterCount} more`,
          angle: hashToAngle("cluster"),
          ring: 1,
          kind: "cluster",
          count: clusterCount,
        }
      : null;

  const user: MapNode = {
    id: "user",
    label: "You",
    angle: 0,
    ring: 0,
    kind: "user",
  };

  const activeCount = visibleArcs.filter((a) => a.kind === "active").length;

  return { user, companies: companyNodes, cluster, arcs: visibleArcs, activeCount };
}
