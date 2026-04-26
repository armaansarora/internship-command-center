import type { JSX } from "react";
import { colorForPercentile, type PinColor } from "@/lib/parlor/pin-color";

/**
 * Comp-band chart (hand-rolled SVG).
 *
 * Back-wall chart slot for the Negotiation Parlor. Plots the market
 * percentile rails (p25/p50/p75) and stacks the user's offer(s) as pins
 * coloured by the rail relationship — red below p25, gold above p75, ink
 * inside. No chart library. Native SVG only — R10's anti-pattern list
 * explicitly rules out Recharts/Victory/D3/Chart.js/Nivo/Plotly because a
 * "generic Comp benchmarks page" is exactly what drifts out of a chart
 * library in this surface.
 *
 * Label-collision behaviour: if a later pin's x falls within 2*r of an
 * earlier pin, its label is bumped up by 14px per collision so stacked
 * labels read top-to-bottom rather than overprinting.
 *
 * The `bands` prop is purposefully a local shape (not LookupResult) so
 * the chart is decoupled from the cache layer — the call site adapts.
 */

export interface CompBands {
  p25: number;
  p50: number;
  p75: number;
  sampleSize: number;
  source: string;
}

export interface CompPin {
  label: string;
  base: number;
}

interface Props {
  bands: CompBands | null;
  pins: CompPin[];
  width?: number;
  height?: number;
}

const INK = "#C9A84C"; // brand ink-gold (inside-band)
const HIGH = "#E8C96A"; // above-p75 signal
const LOW = "#DC3C3C"; // below-p25 warning

function fillForColor(color: PinColor): string {
  if (color === "red") return LOW;
  if (color === "gold") return HIGH;
  return INK;
}

export function CompBandChart({
  bands,
  pins,
  width = 480,
  height = 140,
}: Props): JSX.Element {
  if (!bands) {
    return (
      <div
        className="parlor-chart-empty"
        role="region"
        aria-label="Compensation benchmark"
      >
        <h3>Compensation</h3>
        <p>
          Not enough benchmark data for this role + location yet. Your offer
          stands alone.
        </p>
      </div>
    );
  }

  const margin = 48;
  const chartW = width - margin * 2;
  const pinRadius = 8;
  const low = Math.min(bands.p25, ...pins.map((p) => p.base)) * 0.92;
  const high = Math.max(bands.p75, ...pins.map((p) => p.base)) * 1.08;
  const span = high - low || 1;
  const xFor = (v: number): number => margin + ((v - low) / span) * chartW;

  // Simple left-to-right collision dodge for label placement. If a pin's
  // x is within 2*r of any earlier pin, stack its label 14px further up.
  const placedX: number[] = [];

  const rails: Array<{ id: "p25" | "p50" | "p75"; h: number; y: number; fill: string }> = [
    { id: "p25", h: 16, y: margin + 32, fill: "#c9a84c" },
    { id: "p50", h: 24, y: margin + 28, fill: "#e8c96a" },
    { id: "p75", h: 16, y: margin + 32, fill: "#c9a84c" },
  ];
  return (
    <svg role="img" aria-label="Compensation benchmark" viewBox={`0 0 ${width} ${height}`} className="parlor-chart">
      <line x1={margin} y1={margin + 40} x2={width - margin} y2={margin + 40} stroke="rgba(201,168,76,0.25)" strokeWidth={1} />
      {rails.map((r) => (
        <g key={r.id}>
          <rect data-testid={`band-${r.id}`} x={xFor(bands[r.id])} y={r.y} width={4} height={r.h} fill={r.fill} />
          <text x={xFor(bands[r.id])} y={margin + 68} fontSize={10} textAnchor="middle" fill={r.fill}>
            {r.id} ${(bands[r.id] / 1000).toFixed(0)}k
          </text>
        </g>
      ))}
      {pins.map((p) => {
        const color: PinColor = colorForPercentile(p.base, bands.p25, bands.p75);
        const x = xFor(p.base);
        const collisions = placedX.filter((px) => Math.abs(px - x) < pinRadius * 2).length;
        const labelY = margin - 12 - collisions * 14;
        placedX.push(x);
        return (
          <g key={p.label} data-testid={`pin-${p.label}`} data-color={color}>
            <circle cx={x} cy={margin} r={pinRadius} fill={fillForColor(color)} stroke="#1a1a2e" strokeWidth={1.5} />
            <text x={x} y={labelY} textAnchor="middle" fontSize={11} fill="#c9a84c" fontFamily="JetBrains Mono, monospace">
              {p.label}
            </text>
          </g>
        );
      })}
      <text x={width - margin} y={height - 8} textAnchor="end" fontSize={9} fill="rgba(201,168,76,0.55)">
        {bands.source} — n={bands.sampleSize}
      </text>
    </svg>
  );
}
