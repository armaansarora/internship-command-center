/**
 * R10.3 — parseOfferEmail unit tests.
 *
 * Deterministic regex-driven extraction. Three canonical shapes:
 *  - Clean offer body (all fields present) → fully populated row.
 *  - Sparse body (just company/role/location/base) → defaults + nulls.
 *  - Noisy / no-signal body (missing company OR base) → returns null so the
 *    caller can surface "couldn't parse — enter manually" in the Penthouse.
 *
 * NO LLM in the parser. Tolerate whitespace, comma-formatted numbers, and
 * optional `$` prefixes.
 */
import { describe, it, expect } from "vitest";
import { parseOfferEmail } from "./parse-offer-email";

describe("parseOfferEmail", () => {
  it("extracts base/bonus/equity from a clean offer body", async () => {
    const body = `
      We're delighted to extend an offer:
      Company: Acme Corp
      Role: Software Engineer Intern
      Location: New York, NY
      Base salary: $120,000
      Signing bonus: $10,000
      Annual bonus: 10% target
      Equity: $40,000 over 4 years
      Start date: June 1, 2026
      Response deadline: May 1, 2026
    `;
    const parsed = await parseOfferEmail({
      subject: "Offer of employment",
      body,
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.companyName).toMatch(/acme/i);
    expect(parsed!.role).toMatch(/software engineer/i);
    expect(parsed!.location).toBe("New York, NY");
    expect(parsed!.base).toBe(120000);
    expect(parsed!.signOn).toBe(10000);
    expect(parsed!.equity).toBe(40000);
    expect(parsed!.startDate).toBe("2026-06-01");
    expect(parsed!.deadlineAt).toBe("2026-05-01");
  });

  it("returns partial parse with nulls/zeros for missing fields", async () => {
    const body = `Company: Acme\nRole: Analyst\nLocation: NYC\nBase: $95000`;
    const parsed = await parseOfferEmail({ subject: "offer", body });
    expect(parsed).not.toBeNull();
    expect(parsed!.base).toBe(95000);
    expect(parsed!.signOn).toBe(0);
    expect(parsed!.equity).toBe(0);
    expect(parsed!.bonus).toBe(0);
    expect(parsed!.housing).toBe(0);
    expect(parsed!.startDate).toBeNull();
    expect(parsed!.deadlineAt).toBeNull();
    expect(parsed!.level).toBeNull();
  });

  it("returns null when we can't extract a company + base", async () => {
    const parsed = await parseOfferEmail({
      subject: "no signal here",
      body: "hi, hope you're well. let's chat.",
    });
    expect(parsed).toBeNull();
  });

  it("returns null when company is present but base is missing", async () => {
    const parsed = await parseOfferEmail({
      subject: "offer",
      body: `Company: Acme\nRole: Analyst\nLocation: NYC`,
    });
    expect(parsed).toBeNull();
  });

  it("returns null when base is present but company is missing", async () => {
    const parsed = await parseOfferEmail({
      subject: "offer",
      body: `Role: Analyst\nLocation: NYC\nBase salary: $100,000`,
    });
    expect(parsed).toBeNull();
  });

  it("tolerates comma-formatted numbers and optional $", async () => {
    const body = `Company: TestCo\nRole: Engineer\nLocation: SF\nBase salary: 200,000\nSigning bonus: 25000`;
    const parsed = await parseOfferEmail({ subject: "offer", body });
    expect(parsed).not.toBeNull();
    expect(parsed!.base).toBe(200000);
    expect(parsed!.signOn).toBe(25000);
  });
});
