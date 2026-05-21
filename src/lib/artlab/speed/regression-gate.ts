export const ALLOWED_REGRESSION_PERCENT = 10;

export interface RegressionGateInput {
  baselineMs: number;
  prMs: number;
}

export interface RegressionGateResult {
  passed: boolean;
  regressionPercent: number;
  message: string;
}

export function assertNoSpeedRegression(input: RegressionGateInput): RegressionGateResult {
  if (input.baselineMs <= 0) return { passed: true, regressionPercent: 0, message: "no baseline available" };
  const regressionPercent = ((input.prMs - input.baselineMs) / input.baselineMs) * 100;
  const passed = regressionPercent <= ALLOWED_REGRESSION_PERCENT;
  return {
    passed,
    regressionPercent: Math.round(regressionPercent * 10) / 10,
    message: passed
      ? `OK: ${input.prMs}ms vs baseline ${input.baselineMs}ms (${regressionPercent.toFixed(1)}%)`
      : `REGRESSION: ${input.prMs}ms exceeds baseline ${input.baselineMs}ms by ${regressionPercent.toFixed(1)}% (cap ${ALLOWED_REGRESSION_PERCENT}%)`,
  };
}
