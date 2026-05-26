export interface ArtLabSvgStrokeWidthRules {
  strokeWidthPx: number;
  strokeWidthTolerancePx: number;
}

export interface ArtLabSvgStrokeWidthReport {
  passed: boolean;
  observed: ReadonlyArray<number>;
  outliers: ReadonlyArray<number>;
  reason?: string;
}

const STROKE_RE = /stroke-width\s*=\s*"([0-9]+(?:\.[0-9]+)?)"/g;
const SVG_OPEN_RE = /<svg\b[^>]*>/;

function parentStrokeWidth(svg: string): number | undefined {
  const open = SVG_OPEN_RE.exec(svg);
  if (!open) return undefined;
  const re = /stroke-width\s*=\s*"([0-9]+(?:\.[0-9]+)?)"/;
  const m = re.exec(open[0]);
  return m ? Number(m[1]) : undefined;
}

export function evaluateArtLabSvgStrokeWidth(
  svg: string,
  rules: ArtLabSvgStrokeWidthRules,
): ArtLabSvgStrokeWidthReport {
  const observed: number[] = [];
  const parent = parentStrokeWidth(svg);
  if (parent !== undefined) observed.push(parent);
  const matches = [...svg.matchAll(STROKE_RE)];
  const childWidths = matches
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  if (parent !== undefined) {
    // Skip the parent's own attribute occurrence (already captured).
    childWidths.shift();
  }
  for (const n of childWidths) observed.push(n);
  if (observed.length === 0) {
    return {
      passed: false,
      observed: [],
      outliers: [],
      reason: "no stroke-width declared anywhere in svg",
    };
  }
  const lower = rules.strokeWidthPx - rules.strokeWidthTolerancePx;
  const upper = rules.strokeWidthPx + rules.strokeWidthTolerancePx;
  const outliers = observed.filter((n) => n < lower || n > upper);
  return {
    passed: outliers.length === 0,
    observed,
    outliers,
  };
}
