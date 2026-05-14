import type { JSX } from "react";
import { colorForPercentile, type PinColor } from "@/lib/parlor/pin-color";

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

const INK = "#C9A84C";
const HIGH = "#E8C96A";
const LOW = "#DC3C3C";

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
  void width;
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

  const low = Math.min(bands.p25, ...pins.map((p) => p.base)) * 0.92;
  const high = Math.max(bands.p75, ...pins.map((p) => p.base)) * 1.08;
  const span = high - low || 1;
  const pctFor = (v: number): number =>
    Math.max(0, Math.min(100, ((v - low) / span) * 100));

  const rails: Array<{ id: "p25" | "p50" | "p75"; fill: string }> = [
    { id: "p25", fill: INK },
    { id: "p50", fill: HIGH },
    { id: "p75", fill: INK },
  ];
  const placed: number[] = [];

  return (
    <div
      role="img"
      aria-label="Compensation benchmark"
      className="parlor-chart"
      style={{ position: "relative", height, minHeight: 140, width: "100%" }}
    >
      <div aria-hidden="true" style={{ position: "absolute", left: 24, right: 24, top: 88, height: 1, background: "rgba(201,168,76,0.25)" }} />
      {rails.map((rail) => (
        <div
          key={rail.id}
          data-testid={`band-${rail.id}`}
          style={{
            position: "absolute",
            left: `${pctFor(bands[rail.id])}%`,
            top: rail.id === "p50" ? 76 : 80,
            width: 4,
            height: rail.id === "p50" ? 24 : 16,
            transform: "translateX(-50%)",
            background: rail.fill,
          }}
        >
          <span style={{ position: "absolute", top: 32, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 10, color: rail.fill }}>
            {rail.id} ${(bands[rail.id] / 1000).toFixed(0)}k
          </span>
        </div>
      ))}
      {pins.map((pin) => {
        const color = colorForPercentile(pin.base, bands.p25, bands.p75);
        const leftPercent = pctFor(pin.base);
        const collisions = placed.filter((x) => Math.abs(x - leftPercent) < 5).length;
        placed.push(leftPercent);
        return (
          <div
            key={pin.label}
            data-testid={`pin-${pin.label}`}
            data-color={color}
            style={{
              position: "absolute",
              left: `${leftPercent}%`,
              top: 48 - collisions * 14,
              transform: "translateX(-50%)",
              display: "grid",
              placeItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: INK, fontFamily: "JetBrains Mono, monospace" }}>{pin.label}</span>
            <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", background: fillForColor(color), border: "1.5px solid #1a1a2e" }} />
          </div>
        );
      })}
      <span style={{ position: "absolute", right: 24, bottom: 8, fontSize: 9, color: "rgba(201,168,76,0.55)" }}>
        {bands.source} · n={bands.sampleSize}
      </span>
    </div>
  );
}
