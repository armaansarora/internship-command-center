/**
 * draftReferenceRequest helper contract tests.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(async () => ({
    object: {
      subject: "Quick ask — reference for Acme Analyst role",
      body:
        "Hi Sarah, I just got an offer from Acme for their Analyst role and I'd love to list you as a reference. Would you be open to a short phone call or a written note? No pressure if now isn't the right time — happy to share more context on the role. Thanks, Armaan",
    },
    usage: { inputTokens: 25, outputTokens: 45 },
  })),
}));

vi.mock("@/lib/ai/model", () => ({ getAgentModel: () => null }));

import { draftReferenceRequest } from "../reference-request";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

function makeContact(overrides: Partial<ContactForAgent> = {}): ContactForAgent {
  return {
    id: "c1",
    name: "Sarah Chen",
    email: "sarah@example.com",
    title: "Senior PM",
    companyId: "cx",
    companyName: "Globex",
    relationship: "former manager",
    linkedinUrl: null,
    phone: null,
    introducedBy: null,
    notes: "Worked together on the 2025 rollout launch.",
    privateNote: null,
    source: "manual",
    lastContactAt: "2026-04-20T00:00:00.000Z",
    warmthLevel: "warm",
    warmthScore: 92,
    daysSinceContact: 4,
    ...overrides,
  };
}

function makeOffer(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: "o1",
    user_id: "u1",
    application_id: null,
    company_name: "Acme",
    role: "Analyst",
    level: null,
    location: "NYC",
    base: 180000,
    bonus: 0,
    equity: 0,
    sign_on: 0,
    housing: 0,
    start_date: null,
    benefits: {},
    received_at: "2026-04-23T00:00:00.000Z",
    deadline_at: null,
    status: "received",
    created_at: "2026-04-23T00:00:00.000Z",
    updated_at: "2026-04-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("R10.14 draftReferenceRequest", () => {
  it("returns subject + body matching the schema", async () => {
    const out = await draftReferenceRequest({
      userFirstName: "Armaan",
      contact: makeContact(),
      offer: makeOffer(),
    });
    expect(out.subject).toMatch(/acme/i);
    expect(out.body.length).toBeGreaterThan(40);
  });

  it("prompt carries contact name, company, role, and prior-interaction notes", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await draftReferenceRequest({
      userFirstName: "Armaan",
      contact: makeContact({ name: "Sarah Chen", notes: "rollout launch" }),
      offer: makeOffer({ company_name: "Globex", role: "Trader" }),
    });

    const call = mock.mock.calls[0]![0] as unknown as { prompt: string };
    expect(call.prompt).toContain("Sarah Chen");
    expect(call.prompt).toContain("Globex");
    expect(call.prompt).toContain("Trader");
    expect(call.prompt).toContain("rollout launch");
  });

  it("system prompt anchors on userFirstName, bans cliches, caps word count", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await draftReferenceRequest({
      userFirstName: "Armaan",
      contact: makeContact(),
      offer: makeOffer(),
    });

    const call = mock.mock.calls[0]![0] as unknown as { system: string };
    expect(call.system).toContain("Armaan");
    expect(call.system.toLowerCase()).toContain("i hope this email finds you well");
    expect(call.system).toMatch(/180 words/);
  });

  it("R8/P5 — privateNote is NEVER included in the prompt sent to the LLM", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await draftReferenceRequest({
      userFirstName: "Armaan",
      contact: makeContact({
        privateNote: "SECRET: Sarah hates Globex's CEO",
      }),
      offer: makeOffer(),
    });

    const call = mock.mock.calls[0]![0] as unknown as {
      prompt: string;
      system: string;
    };
    expect(call.prompt).not.toContain("SECRET");
    expect(call.prompt).not.toContain("hates Globex");
    expect(call.prompt).not.toContain("privateNote");
    expect(call.system).not.toContain("SECRET");
    expect(call.system).not.toContain("privateNote");
  });
});
