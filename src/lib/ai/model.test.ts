import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAgentModelConfigured, isGatewayEnabled } from "./model";

const ORIGINAL_ENV = {
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  VERCEL_AI_GATEWAY_API_KEY: process.env.VERCEL_AI_GATEWAY_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

function clearModelEnv(): void {
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_AI_GATEWAY_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
}

describe("AI model provider configuration", () => {
  beforeEach(() => {
    clearModelEnv();
  });

  afterEach(() => {
    clearModelEnv();
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
  });

  it("reports no agent model when every supported provider key is absent", () => {
    expect(isGatewayEnabled()).toBe(false);
    expect(isAgentModelConfigured()).toBe(false);
  });

  it("accepts the direct Anthropic provider key", () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";

    expect(isGatewayEnabled()).toBe(false);
    expect(isAgentModelConfigured()).toBe(true);
  });

  it("accepts either AI Gateway key", () => {
    process.env.AI_GATEWAY_API_KEY = "gateway-key";

    expect(isGatewayEnabled()).toBe(true);
    expect(isAgentModelConfigured()).toBe(true);

    delete process.env.AI_GATEWAY_API_KEY;
    process.env.VERCEL_AI_GATEWAY_API_KEY = "vercel-gateway-key";

    expect(isGatewayEnabled()).toBe(true);
    expect(isAgentModelConfigured()).toBe(true);
  });

  it("falls through empty strings to later provider keys", () => {
    process.env.AI_GATEWAY_API_KEY = "";
    process.env.VERCEL_AI_GATEWAY_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "anthropic-key";

    expect(isGatewayEnabled()).toBe(false);
    expect(isAgentModelConfigured()).toBe(true);
  });
});
