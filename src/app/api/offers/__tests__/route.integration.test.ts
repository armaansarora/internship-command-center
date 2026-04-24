/**
 * R10 post-mortem (test-tightening pass) — POST /api/offers integration test.
 *
 * The R10 Proof line says: "Offer arriving via email parses INTO the offers
 * table." The original parser test (src/lib/offers/parse-offer-email.test.ts)
 * only proved the parser's output shape against an in-memory object — it never
 * round-tripped through the route or the offers-rest INSERT helper. This file
 * closes that gap: build a realistic offer email, run it through
 * `parseOfferEmail`, POST the parsed data to /api/offers, and assert that
 * the captured `insertOffer` call carries the parsed values + the
 * authenticated `userId`.
 *
 * Two integration gaps surfaced while writing this test (do NOT silently fix;
 * they're real and belong on the post-R10 hardening backlog):
 *
 *   GAP A — there is no `emailText` surface on POST /api/offers. The endpoint
 *   accepts pre-parsed structured data only. Any "email arriving" today must
 *   route through a Penthouse ingest layer that calls `parseOfferEmail` first
 *   and then POSTs the structured shape. This test exercises that real chain
 *   (parser → POST → insert) rather than a hypothetical raw-email surface.
 *
 *   GAP B — `parseOfferEmail` returns date-only ISO ("2026-05-01") for
 *   `deadlineAt`, but the route's Zod schema requires `z.string().datetime()`
 *   (full ISO). Posting the parser output verbatim yields a 400. Callers must
 *   coerce. This test coerces explicitly with a comment on the line; an
 *   additional `it()` below pins the gap as a regression-trip-wire so a
 *   future schema change doesn't silently break callers (or vice versa).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

type RequireUserApiResult =
  | { ok: true; user: { id: string; firstName?: string } }
  | { ok: false; response: Response };

const requireUserApiMock = vi.hoisted(() =>
  vi.fn<() => Promise<RequireUserApiResult>>(async () => ({
    ok: true,
    user: { id: "u1", firstName: "Armaan" },
  })),
);
vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserApiMock,
}));

const insertOfferMock = vi.hoisted(() => vi.fn());
const getOffersForUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/offers-rest", () => ({
  insertOffer: insertOfferMock,
  getOffersForUser: getOffersForUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

import { POST } from "../route";
import { parseOfferEmail } from "@/lib/offers/parse-offer-email";

/**
 * Realistic-but-parser-friendly offer body. Intro is intentionally bare —
 * the regex parser's `pickLine` consumes whitespace (including newlines)
 * after the matched key, so an intro line containing "role" or "position"
 * will swallow the next non-empty line into the role capture. That's a
 * separate parser-robustness issue tracked outside this proof.
 */
const offerEmail = `
Hi Armaan,

Pleased to extend the following offer:

Company: Acme Corp
Role: Software Engineer Intern
Location: New York, NY
Base salary: $150,000
Signing bonus: $25,000
Equity: $40,000 over 4 years
Start date: June 1, 2026
Response deadline: May 1, 2026

Best,
Recruiting
`;

describe("R10 post-mortem — POST /api/offers integration (parser → route → insert)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserApiMock.mockImplementation(async () => ({
      ok: true as const,
      user: { id: "u1", firstName: "Armaan" },
    }));
    insertOfferMock.mockImplementation(async (_client, input) => ({
      id: "new-offer-1",
      user_id: input.userId,
      application_id: input.applicationId ?? null,
      company_name: input.companyName,
      role: input.role,
      level: input.level ?? null,
      location: input.location,
      base: input.base,
      bonus: input.bonus ?? 0,
      equity: input.equity ?? 0,
      sign_on: input.signOn ?? 0,
      housing: input.housing ?? 0,
      start_date: input.startDate ?? null,
      benefits: input.benefits ?? {},
      received_at: "2026-04-24T00:00:00.000Z",
      deadline_at: input.deadlineAt ?? null,
      status: "received",
      created_at: "2026-04-24T00:00:00.000Z",
      updated_at: "2026-04-24T00:00:00.000Z",
    }));
  });

  it("parses the email AND inserts the parsed values into the offers table with the authenticated userId", async () => {
    const parsed = await parseOfferEmail({
      subject: "Offer of employment",
      body: offerEmail,
    });
    expect(parsed).not.toBeNull();
    // Sanity: parser pulled the headline numbers we'll assert downstream.
    expect(parsed!.companyName).toMatch(/acme/i);
    expect(parsed!.base).toBe(150000);
    expect(parsed!.signOn).toBe(25000);
    expect(parsed!.equity).toBeGreaterThan(0);
    expect(parsed!.deadlineAt).toBe("2026-05-01");

    // GAP B coercion — parser yields date-only ISO; the route schema requires
    // datetime. The Penthouse ingest layer would do this; we do it inline.
    const deadlineAtIso = `${parsed!.deadlineAt}T00:00:00.000Z`;
    const startDate = parsed!.startDate; // route schema accepts z.string().date()

    const req = new Request("http://localhost/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName: parsed!.companyName,
        role: parsed!.role,
        location: parsed!.location,
        base: parsed!.base,
        bonus: parsed!.bonus,
        equity: parsed!.equity,
        signOn: parsed!.signOn,
        housing: parsed!.housing,
        startDate,
        deadlineAt: deadlineAtIso,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // The captured insertOffer call carries the parsed values + the
    // authenticated userId — this is the round-trip the proof line demands.
    expect(insertOfferMock).toHaveBeenCalledTimes(1);
    const [, insertInput] = insertOfferMock.mock.calls[0]!;
    expect(insertInput.userId).toBe("u1");
    expect(insertInput.companyName).toMatch(/acme/i);
    expect(insertInput.role).toMatch(/software engineer/i);
    expect(insertInput.location).toBe("New York, NY");
    expect(insertInput.base).toBe(150000);
    expect(insertInput.signOn).toBe(25000);
    expect(insertInput.equity).toBeGreaterThan(0);
    expect(insertInput.deadlineAt).toBe(deadlineAtIso);

    // The response body wraps the inserted row.
    const body = (await res.json()) as { offer: { id: string; user_id: string; base: number } };
    expect(body.offer.id).toBe("new-offer-1");
    expect(body.offer.user_id).toBe("u1");
    expect(body.offer.base).toBe(150000);
  });

  it("returns 401 when unauthenticated and never reaches insertOffer", async () => {
    requireUserApiMock.mockImplementationOnce(async () => ({
      ok: false as const,
      response: new Response(JSON.stringify({ error: "unauth" }), { status: 401 }),
    }));
    const req = new Request("http://localhost/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName: "Acme",
        role: "Engineer",
        location: "NYC",
        base: 150000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(insertOfferMock).not.toHaveBeenCalled();
  });

  /**
   * GAP B trip-wire — pin the parser/route schema mismatch so any future
   * change (parser starts returning datetime, OR route schema relaxes to
   * z.string().date()) flips this test red and forces a deliberate update.
   */
  it("pins the parser/route deadlineAt-format gap (parser yields date-only; route requires datetime)", async () => {
    const parsed = await parseOfferEmail({
      subject: "Offer of employment",
      body: offerEmail,
    });
    expect(parsed!.deadlineAt).toBe("2026-05-01"); // date-only, NOT datetime

    const req = new Request("http://localhost/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName: parsed!.companyName,
        role: parsed!.role,
        location: parsed!.location,
        base: parsed!.base,
        deadlineAt: parsed!.deadlineAt, // raw parser output, no coercion
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(insertOfferMock).not.toHaveBeenCalled();
  });
});
