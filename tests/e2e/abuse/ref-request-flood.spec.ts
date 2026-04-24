import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.4 — ref-request flood — /api/contacts/[id]/reference-request —
 * cooldown blocks spam.
 *
 * Invariant (R12 partner mitigation, 2026-04-24, src commit 98d3c47):
 * a prior reference_request for the same (contact_id, offer_id) within
 * the last 6h returns 429 cooldown_active. The route consults
 * outreach_queue with eq filters on user_id/contact_id/type and a
 * .gte filter on created_at; any row matching the current offer_id in
 * its metadata trips the gate.
 *
 * Strategy: pre-seed outreach_queue with one prior reference_request row
 * that matches our test (contact_id, offer_id, recent created_at). Every
 * subsequent POST against the same pair MUST return 429 — independent of
 * concurrency, because all parallel callers see the same prior row.
 *
 * Bound assertions (DO NOT weaken):
 *   1. Every POST in a 20-request flood returns 429.
 *   2. Each 429 body carries cooldown_active error code AND
 *      retry_after_seconds.
 *   3. No additional outreach_queue write happens during the flood
 *      (the route returns before reaching the insert).
 */

const FLOOD_COUNT = 20;
// Strict UUIDs per RFC 4122 / Zod v4 — section 3 starts with [1-8] (version)
// and section 4 starts with [89abAB] (variant). The previous fixture used
// `0xxx`/`cxxx`/`axxx` in section 3 which Zod's body schema rejected as
// bad_request, so every flood POST returned 400 before reaching the
// cooldown gate.
const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const OFFER_ID = "22222222-2222-4222-8222-222222222222";
const APPLICATION_ID = "33333333-3333-4333-8333-333333333333";
const COMPANY_ID = "44444444-4444-4444-8444-444444444444";
const PRIOR_DRAFT_ID = "55555555-5555-4555-8555-555555555555";

test.describe(
  "ref-request flood — /api/contacts/[contactId]/reference-request — cooldown blocks all repeats",
  () => {
    test.beforeEach(async ({ page }) => {
      // created_at = 1h ago — well within the 6h cooldown window.
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      await signInAs(page, USERS.alice, {
        tables: {
          user_profiles: [
            {
              id: USERS.alice.id,
              networking_consent_at: TIMES.anchor,
              networking_revoked_at: null,
              networking_consent_version: 2,
              firstName: "Alice",
            },
          ],
          contacts: [
            {
              id: CONTACT_ID,
              user_id: USERS.alice.id,
              name: "Carol Example",
              company_id: COMPANY_ID,
              companyId: COMPANY_ID,
            },
          ],
          offers: [
            {
              id: OFFER_ID,
              user_id: USERS.alice.id,
              application_id: APPLICATION_ID,
              company_name: "Acme Rockets",
            },
          ],
          outreach_queue: [
            {
              id: PRIOR_DRAFT_ID,
              user_id: USERS.alice.id,
              contact_id: CONTACT_ID,
              application_id: APPLICATION_ID,
              company_id: COMPANY_ID,
              type: "reference_request",
              status: "pending_approval",
              metadata: { offer_id: OFFER_ID, contact_id: CONTACT_ID },
              created_at: oneHourAgo,
            },
          ],
        },
        allowWrites: true,
      });
    });

    test(
      "20 parallel POSTs against (contact, offer) with prior draft within 6h — all return 429 cooldown_active",
      async ({ page }) => {
        const postUrl = `http://localhost:3000/api/contacts/${CONTACT_ID}/reference-request`;
        const posts = Array.from({ length: FLOOD_COUNT }, () =>
          page.request.post(postUrl, { data: { offerId: OFFER_ID } }),
        );
        const responses = await Promise.all(posts);
        const statuses = responses.map((r) => r.status());
        const bodies = await Promise.all(responses.map((r) => r.json()));

        // Every response must be 429 — the cooldown is the gate, and
        // every caller sees the same prior row.
        expect(statuses.every((s) => s === 429)).toBe(true);

        for (const body of bodies) {
          expect(body.error).toBe("cooldown_active");
          expect(typeof body.retry_after_seconds).toBe("number");
          expect(body.retry_after_seconds).toBeGreaterThan(0);
        }

        // No new outreach_queue rows were inserted — the route 429'd
        // before reaching the insert. Stub /__test__/writes records every
        // non-GET request that landed; only the seeded row exists, no
        // POST/PATCH should appear.
        const writesRes = await page.request.get(
          "http://localhost:3001/__test__/writes",
        );
        const writes = (await writesRes.json()) as Array<{
          table: string;
          method: string;
        }>;
        const queueWrites = writes.filter(
          (w) => w.table === "outreach_queue" && w.method !== "GET",
        );
        expect(
          queueWrites,
          `expected zero outreach_queue writes during flood; got ${queueWrites.length}: ${JSON.stringify(queueWrites)}`,
        ).toHaveLength(0);
      },
    );
  },
);
