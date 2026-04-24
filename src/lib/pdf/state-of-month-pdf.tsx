/**
 * R9.8 — State of the Month PDF.
 *
 * Reuses @react-pdf/renderer (already shipped in R5.7) — partner constraint
 * is explicit: do NOT pick a second PDF library. Layout reads as a CFO's
 * note, not a spreadsheet: generous type, plenty of whitespace, no
 * chartjunk. The Orrery snapshot at the bottom is an inline SVG built from
 * @react-pdf/renderer's <Svg> + <Circle> primitives — no rasterization,
 * no <Image>.
 *
 * The data layer is fully decoupled — this component is pure presentation
 * over a typed StateOfMonthData payload. The route assembles the payload;
 * the helper renders.
 */

import type { JSX } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Line,
  renderToBuffer,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Valid pipeline-stage transitions surfaced in the report. */
export type StageKey =
  | "applied→screening"
  | "screening→interview"
  | "interview→offer";

export interface StateOfMonthStats {
  total: number;
  interviewsBooked: number;
  offers: number;
  rejections: number;
  /** All rates are 0..1; the renderer handles the percent formatting. */
  appliedToScreeningRate: number;
  screeningToInterviewRate: number;
  interviewToOfferRate: number;
  /** null when there isn't enough data to make either claim. */
  weakestStage: StageKey | null;
  strongestStage: StageKey | null;
}

export interface PlanetSnapshot {
  /** Tier 1 (inner) .. 4 (outer). */
  tier: number;
  /** Status string from the application row. */
  status: string;
  /** 0..360 hash-stable angle (matches R9.1's transformer). */
  angleDeg: number;
}

export interface StateOfMonthData {
  /** ISO month, e.g. "2026-04" — rendered as "April 2026". */
  month: string;
  userName: string;
  stats: StateOfMonthStats;
  planetSnapshot: PlanetSnapshot[];
  /** Deterministic, template-driven CFO commentary (NOT AI-generated). */
  cfoNote: string;
}

export interface StateOfMonthPdfProps {
  data: StateOfMonthData;
}

// ---------------------------------------------------------------------------
// Style — single source of truth for the report's visual register
// ---------------------------------------------------------------------------

const COLOR = {
  ink: "#1A1A2E",        // primary dark (Tower)
  body: "#2C2C44",
  muted: "#777",
  hairline: "#D5D5DC",
  gold: "#C9A84C",       // gold accent (Tower)
  cool: "#5A8FB5",       // cool blue for the orrery active state
  dim: "#9AA0AC",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingHorizontal: 64,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.55,
    color: COLOR.body,
  },
  // Header strip
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: COLOR.ink,
    letterSpacing: 0.5,
  },
  headerMonth: {
    fontFamily: "Helvetica",
    fontSize: 13,
    color: COLOR.muted,
    marginTop: 2,
  },
  headerName: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR.muted,
    textAlign: "right",
    marginTop: 6,
  },
  hairline: {
    borderBottomStyle: "solid",
    borderBottomWidth: 0.6,
    borderBottomColor: COLOR.hairline,
    marginTop: 16,
    marginBottom: 22,
  },
  // Sections
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR.gold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionGap: {
    marginBottom: 22,
  },
  // What Happened (stat rows)
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomStyle: "solid",
    borderBottomWidth: 0.4,
    borderBottomColor: COLOR.hairline,
  },
  statRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  statLabel: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: COLOR.body,
  },
  statValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: COLOR.ink,
  },
  // Working / attention lines
  insightLine: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: COLOR.body,
  },
  // CFO note (italic-style — Helvetica-Oblique is built in)
  cfoNote: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 11,
    color: COLOR.muted,
    lineHeight: 1.6,
  },
  // Footer / orrery snapshot
  footerLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR.gold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
  },
  orreryWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  footerNote: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLOR.dim,
    textAlign: "center",
    marginTop: 4,
  },
});

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-04" → "April 2026". Falls back to the raw input if malformed. */
export function formatMonthHeading(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return month;
  return `${MONTH_NAMES[monthIdx]} ${year}`;
}

/** 0..1 → "33%"; clamps; rounds to nearest integer. */
function pct(rate: number): string {
  if (!Number.isFinite(rate)) return "0%";
  const clamped = Math.max(0, Math.min(1, rate));
  return `${Math.round(clamped * 100)}%`;
}

/** Status → planet color. Intentionally muted — this is the cool, contemplative floor. */
function colorForStatus(status: string): string {
  switch (status) {
    case "offer":
    case "accepted":
      return COLOR.gold;
    case "rejected":
    case "withdrawn":
      return COLOR.dim;
    case "interview_scheduled":
    case "interviewing":
      return COLOR.ink;
    default:
      return COLOR.cool;
  }
}

/** Tier → orbit radius (px) inside the 300×300 SVG canvas. Mirrors the screen orrery's "inner = bigger". */
function radiusForTier(tier: number): number {
  const t = Math.max(1, Math.min(4, tier));
  return t * 30 + 10;
}

interface SnapshotPosition {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

/** Polar → cartesian within a 300×300 canvas centred on (150, 150). */
export function projectPlanet(
  planet: PlanetSnapshot,
  canvasSize = 300,
): SnapshotPosition {
  const center = canvasSize / 2;
  const orbit = radiusForTier(planet.tier);
  const rad = (planet.angleDeg * Math.PI) / 180;
  const cx = center + orbit * Math.cos(rad);
  const cy = center + orbit * Math.sin(rad);
  const dotRadius =
    planet.status === "offer" || planet.status === "accepted" ? 5 : 3.2;
  return { cx, cy, r: dotRadius, fill: colorForStatus(planet.status) };
}

const STAGE_LABEL: Record<StageKey, string> = {
  "applied→screening": "applied → screening",
  "screening→interview": "screening → interview",
  "interview→offer": "interview → offer",
};

function rateForStage(stats: StateOfMonthStats, stage: StageKey | null): number {
  if (stage === "applied→screening") return stats.appliedToScreeningRate;
  if (stage === "screening→interview") return stats.screeningToInterviewRate;
  if (stage === "interview→offer") return stats.interviewToOfferRate;
  return 0;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Header({
  month,
  userName,
}: {
  month: string;
  userName: string;
}): JSX.Element {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>The State of the Month</Text>
        <Text style={styles.headerMonth}>{formatMonthHeading(month)}</Text>
      </View>
      <View>
        <Text style={styles.headerName}>{userName}</Text>
      </View>
    </View>
  );
}

function WhatHappened({ stats }: { stats: StateOfMonthStats }): JSX.Element {
  const rows: Array<{ label: string; value: number }> = [
    { label: "Applications added", value: stats.total },
    { label: "Interviews booked", value: stats.interviewsBooked },
    { label: "Offers", value: stats.offers },
    { label: "Rejections", value: stats.rejections },
  ];
  return (
    <View style={styles.sectionGap}>
      <Text style={styles.sectionLabel}>What happened</Text>
      <View>
        {rows.map((row, idx) => (
          <View
            key={row.label}
            style={idx === rows.length - 1 ? styles.statRowLast : styles.statRow}
          >
            <Text style={styles.statLabel}>{row.label}</Text>
            <Text style={styles.statValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WhatsWorking({ stats }: { stats: StateOfMonthStats }): JSX.Element {
  const stage = stats.strongestStage;
  const line = stage
    ? `Best stage: ${STAGE_LABEL[stage]} at ${pct(rateForStage(stats, stage))}.`
    : "Not enough data yet to show a strongest stage.";
  return (
    <View style={styles.sectionGap}>
      <Text style={styles.sectionLabel}>{"What's working"}</Text>
      <Text style={styles.insightLine}>{line}</Text>
    </View>
  );
}

function WhatNeedsAttention({
  stats,
}: {
  stats: StateOfMonthStats;
}): JSX.Element {
  const stage = stats.weakestStage;
  const line = stage
    ? `Slowest stage: ${STAGE_LABEL[stage]} at ${pct(rateForStage(stats, stage))}.`
    : "Not enough data yet to show a weakest stage.";
  return (
    <View style={styles.sectionGap}>
      <Text style={styles.sectionLabel}>What needs attention</Text>
      <Text style={styles.insightLine}>{line}</Text>
    </View>
  );
}

function CfoNote({ note }: { note: string }): JSX.Element {
  return (
    <View style={styles.sectionGap}>
      <Text style={styles.sectionLabel}>{"CFO's note"}</Text>
      <Text style={styles.cfoNote}>{note}</Text>
    </View>
  );
}

function OrrerySnapshot({
  planets,
}: {
  planets: PlanetSnapshot[];
}): JSX.Element {
  // Four orbit rings — one per tier.
  const orbits = [1, 2, 3, 4].map((tier) => ({
    tier,
    r: radiusForTier(tier),
  }));
  const projected = planets.map((p) => projectPlanet(p, 300));
  return (
    <View>
      <Text style={styles.footerLabel}>Snapshot</Text>
      <View style={styles.orreryWrapper}>
        <Svg width={300} height={300}>
          {/* Cross-hair so the empty case still reads as an orrery. */}
          <Line
            x1={150}
            y1={10}
            x2={150}
            y2={290}
            stroke={COLOR.hairline}
            strokeWidth={0.3}
          />
          <Line
            x1={10}
            y1={150}
            x2={290}
            y2={150}
            stroke={COLOR.hairline}
            strokeWidth={0.3}
          />
          {orbits.map((orbit) => (
            <Circle
              key={`orbit-${orbit.tier}`}
              cx={150}
              cy={150}
              r={orbit.r}
              stroke={COLOR.hairline}
              strokeWidth={0.5}
              fill="none"
            />
          ))}
          {projected.map((pos, idx) => (
            <Circle
              key={`planet-${idx}`}
              cx={pos.cx}
              cy={pos.cy}
              r={pos.r}
              fill={pos.fill}
            />
          ))}
        </Svg>
        <Text style={styles.footerNote}>
          Pipeline at month end. Rings are tiers; gold marks an offer.
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function StateOfMonthPdf({ data }: StateOfMonthPdfProps): JSX.Element {
  return (
    <Document
      title={`State of the Month — ${formatMonthHeading(data.month)}`}
      author={data.userName}
    >
      <Page size="LETTER" style={styles.page}>
        <Header month={data.month} userName={data.userName} />
        <View style={styles.hairline} />
        <WhatHappened stats={data.stats} />
        <WhatsWorking stats={data.stats} />
        <WhatNeedsAttention stats={data.stats} />
        <CfoNote note={data.cfoNote} />
        <OrrerySnapshot planets={data.planetSnapshot} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Helper — server-side render to a Buffer
// ---------------------------------------------------------------------------

/**
 * Render the State of the Month PDF to a Buffer. Single round-trip into
 * @react-pdf/renderer; safe to call from a Next.js route handler.
 */
export async function generateStateOfMonthPdf(
  data: StateOfMonthData,
): Promise<Buffer> {
  const tree = StateOfMonthPdf({ data });
  const result = await renderToBuffer(tree);
  // @react-pdf/renderer types renderToBuffer as Promise<NodeJS.ReadableStream>
  // in some setups but in practice returns a Buffer at runtime. Cast through
  // unknown to keep the surface honest.
  return result as unknown as Buffer;
}
