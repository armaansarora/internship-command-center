const SVG_OPEN_RE = /<svg\b[^>]*>/;
const ARIA_RE = /aria-label\s*=\s*"([^"]+)"/;

export interface FoundrySvgAriaLabelReport {
  passed: boolean;
  observed?: string;
  reason?: string;
}

export function evaluateFoundrySvgAriaLabel(
  svg: string,
  expected: string,
): FoundrySvgAriaLabelReport {
  const open = SVG_OPEN_RE.exec(svg);
  if (!open) {
    return { passed: false, reason: "no <svg> root element" };
  }
  const m = ARIA_RE.exec(open[0]);
  if (!m) {
    return { passed: false, reason: "aria-label attribute missing on <svg>" };
  }
  const observed = m[1] ?? "";
  return {
    passed: observed === expected,
    observed,
  };
}
