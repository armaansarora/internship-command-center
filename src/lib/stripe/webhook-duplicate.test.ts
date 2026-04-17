import { describe, expect, it } from "vitest";
import {
  STALE_RECEIVED_MS,
  stripeWebhookDuplicateDecision,
} from "./webhook-duplicate";

describe("stripeWebhookDuplicateDecision", () => {
  const now = 1_700_000_000_000;

  it("acks when already processed", () => {
    expect(
      stripeWebhookDuplicateDecision(
        { status: "processed", receivedAt: new Date(now).toISOString() },
        now,
      ),
    ).toBe("ack_duplicate");
  });

  it("retries when failed", () => {
    expect(
      stripeWebhookDuplicateDecision(
        { status: "failed", receivedAt: new Date(now).toISOString() },
        now,
      ),
    ).toBe("retry_processing");
  });

  it("acks in-flight received rows that are not stale", () => {
    const recent = new Date(now - STALE_RECEIVED_MS / 2).toISOString();
    expect(
      stripeWebhookDuplicateDecision({ status: "received", receivedAt: recent }, now),
    ).toBe("ack_in_flight");
  });

  it("retries stale received rows", () => {
    const stale = new Date(now - STALE_RECEIVED_MS - 1).toISOString();
    expect(
      stripeWebhookDuplicateDecision({ status: "received", receivedAt: stale }, now),
    ).toBe("retry_processing");
  });

  it("retries when timestamp is missing", () => {
    expect(
      stripeWebhookDuplicateDecision({ status: "received", receivedAt: null }, now),
    ).toBe("retry_processing");
  });
});
