import { describe, it, expect } from "vitest";
import {
  pipelineWeatherDelta,
  weatherLabel,
  WEATHER_MAX,
  WEATHER_MIN,
} from "./pipeline-weather";

const empty = { newApps: 0, responses: 0, rejections: 0, staleCount: 0 };

describe("pipelineWeatherDelta", () => {
  it("returns 0 for no signal", () => {
    expect(pipelineWeatherDelta(empty)).toBe(0);
  });

  it("clamps to WEATHER_MAX on maximum positive signal", () => {
    const d = pipelineWeatherDelta({
      ...empty,
      newApps: 20,
      responses: 20,
      importantEmailCount: 5,
    });
    expect(d).toBeCloseTo(WEATHER_MAX, 4);
  });

  it("clamps to WEATHER_MIN on maximum negative signal", () => {
    const d = pipelineWeatherDelta({ ...empty, rejections: 20, staleCount: 20 });
    expect(d).toBeCloseTo(WEATHER_MIN, 4);
  });

  it("a single new app yields a small positive shift", () => {
    const d = pipelineWeatherDelta({ ...empty, newApps: 1 });
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(0.01);
  });

  it("a single rejection yields a small negative shift", () => {
    const d = pipelineWeatherDelta({ ...empty, rejections: 1 });
    expect(d).toBeLessThan(0);
    expect(d).toBeGreaterThanOrEqual(-0.02);
  });

  it("an important email beats new apps on absolute magnitude", () => {
    const appsOnly = pipelineWeatherDelta({ ...empty, newApps: 3 });
    const emailOnly = pipelineWeatherDelta({ ...empty, importantEmailCount: 1 });
    expect(emailOnly).toBeGreaterThanOrEqual(appsOnly);
  });

  it("rejections cancel out new apps on a mixed night", () => {
    const balanced = pipelineWeatherDelta({
      ...empty,
      newApps: 2,
      rejections: 2,
    });
    expect(Math.abs(balanced)).toBeLessThanOrEqual(0.02);
  });

  it("staleCount below threshold (< 3) does not apply drag", () => {
    const d = pipelineWeatherDelta({ ...empty, staleCount: 2 });
    expect(d).toBe(0);
  });

  it("staleCount at threshold (3) applies mild drag", () => {
    const d = pipelineWeatherDelta({ ...empty, staleCount: 3 });
    expect(d).toBeLessThan(0);
    expect(d).toBeGreaterThan(-0.02);
  });
});

describe("weatherLabel", () => {
  it("labels positive deltas above the threshold as 'gold'", () => {
    expect(weatherLabel(0.03)).toBe("gold");
    expect(weatherLabel(0.02)).toBe("gold");
  });

  it("labels negative deltas below the threshold as 'dim'", () => {
    expect(weatherLabel(-0.03)).toBe("dim");
    expect(weatherLabel(-0.02)).toBe("dim");
  });

  it("labels near-zero deltas as 'cool'", () => {
    expect(weatherLabel(0)).toBe("cool");
    expect(weatherLabel(0.01)).toBe("cool");
    expect(weatherLabel(-0.01)).toBe("cool");
  });
});
