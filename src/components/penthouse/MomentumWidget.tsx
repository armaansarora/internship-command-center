import type { CSSProperties, JSX } from "react";
import type { MomentumSummary } from "@/lib/penthouse/momentum";

/**
 * Momentum — last-14-days movement from daily_snapshots, finally on screen.
 * Bars are styled divs per the house SVG-retirement rule (no handwritten SVG
 * in src/ — enforced by src/__tests__/no-handwritten-svg.test.ts). Static
 * heights, no animation — reduced-motion safe by construction. Sparse data
 * renders a designed empty state, never a broken chart (PG-1 lesson).
 */

const DIRECTION_COPY: Record<MomentumSummary["direction"], { label: string; color: string; arrow: string }> = {
  rising: { label: "rising", color: "var(--success, #5fae7f)", arrow: "▲" },
  steady: { label: "steady", color: "var(--text-muted, rgba(245,238,225,0.62))", arrow: "→" },
  cooling: { label: "cooling", color: "var(--warning, #d9a441)", arrow: "▼" },
};

const CHART_HEIGHT = 84;

export function MomentumWidget({ momentum }: { momentum: MomentumSummary }): JSX.Element {
  if (!momentum.hasEnoughData) {
    return (
      <section aria-label="Momentum" data-testid="momentum-widget" style={wrapStyle}>
        <header style={headerStyle}>
          <h3 style={titleStyle}>Momentum</h3>
        </header>
        <div data-testid="momentum-empty" style={{ padding: "14px 2px 6px" }}>
          <p style={{ margin: 0, color: "#F5EEE1", fontWeight: 600, fontSize: "14px" }}>
            {momentum.points.length === 1
              ? "First snapshot logged — momentum starts tomorrow."
              : "No snapshot history yet."}
          </p>
          <p style={{ margin: "5px 0 0", color: "rgba(245,238,225,0.62)", fontSize: "13px" }}>
            The Tower records your pipeline every day with the morning briefing; after a
            couple of days the trend shows up here.
          </p>
        </div>
      </section>
    );
  }

  const { points, appsAdded, pipelineDelta, interviewDelta, direction } = momentum;
  const dir = DIRECTION_COPY[direction];
  const maxPipeline = Math.max(...points.map((p) => p.activePipeline), 1);

  // Claims audit (siege kill): direction blends pipeline AND interview movement,
  // so the label says "momentum", never "pipeline" — bars can fall while
  // interviews rise. Per-series truth lives in the legend.
  const headline = [
    appsAdded > 0 ? `+${appsAdded} application${appsAdded === 1 ? "" : "s"}` : "no new applications",
    `momentum ${dir.label}`,
  ].join(" · ");

  const description =
    `Momentum over ${points.length} snapshots from ${momentum.firstDate} to ` +
    `${momentum.lastDate}: ${headline}; pipeline change ${pipelineDelta >= 0 ? "+" : ""}${pipelineDelta}, ` +
    `interview change ${interviewDelta >= 0 ? "+" : ""}${interviewDelta}.`;

  return (
    <section aria-label="Momentum" data-testid="momentum-widget" style={wrapStyle}>
      <header style={headerStyle}>
        <h3 style={titleStyle}>Momentum</h3>
        <span data-testid="momentum-headline" style={{ ...headlineStyle, color: dir.color }}>
          {dir.arrow} {headline}
        </span>
      </header>

      <div role="img" aria-label={description} data-testid="momentum-chart">
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "5px",
            height: `${CHART_HEIGHT + 12}px`,
          }}
        >
          {points.map((p, i) => {
            const barH = Math.max(3, Math.round((p.activePipeline / maxPipeline) * CHART_HEIGHT));
            const grewInterviews = i > 0 && p.interviewCount > points[i - 1].interviewCount;
            return (
              <div
                key={p.date}
                data-testid="momentum-bar"
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "4px",
                }}
              >
                {grewInterviews ? (
                  <span
                    data-testid="momentum-interview-dot"
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--success, #5fae7f)",
                    }}
                  />
                ) : null}
                <span
                  style={{
                    display: "block",
                    width: "100%",
                    height: `${barH}px`,
                    borderRadius: "3px 3px 1px 1px",
                    background: "var(--gold, #C9A84C)",
                    opacity: 0.32 + 0.68 * ((i + 1) / points.length),
                  }}
                />
              </div>
            );
          })}
        </div>
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
            fontSize: "10px",
            fontFamily: "var(--font-mono, monospace)",
            color: "rgba(245,238,225,0.45)",
          }}
        >
          <span>{momentum.firstDate}</span>
          <span>{momentum.lastDate}</span>
        </div>
      </div>

      <p style={legendStyle}>
        Bars: active pipeline per snapshot · dot: interviews moved since the prior snapshot
        {interviewDelta !== 0
          ? ` · interviews ${interviewDelta > 0 ? "+" : ""}${interviewDelta} this window`
          : ""}
      </p>
    </section>
  );
}

const wrapStyle: CSSProperties = {
  border: "1px solid rgba(245,238,225,0.10)",
  borderRadius: "14px",
  padding: "16px 18px",
  background: "rgba(13,13,26,0.45)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "10px",
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(245,238,225,0.75)",
};

const headlineStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};

const legendStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "11.5px",
  color: "rgba(245,238,225,0.45)",
};
