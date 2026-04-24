import { describe, it, expect, vi } from "vitest";
import {
  countOffersForUser,
  getOffersForUser,
  getOfferById,
  insertOffer,
  updateOfferStatus,
  normalizeCompanyName,
} from "./offers-rest";

function makeSupabase(overrides: Record<string, unknown>) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    ...overrides,
  };
  const client = { from: vi.fn(() => builder) };
  return { client: client as unknown as Parameters<typeof countOffersForUser>[0], builder };
}

describe("offers-rest", () => {
  it("normalizeCompanyName lowercases, trims, collapses whitespace, strips 'inc.'", () => {
    expect(normalizeCompanyName("  Acme  Corp  ")).toBe("acme");
    expect(normalizeCompanyName("Acme, Inc.")).toBe("acme");
    expect(normalizeCompanyName("Meta Platforms Inc")).toBe("meta platforms");
    expect(normalizeCompanyName("")).toBe("");
    expect(normalizeCompanyName("OpenAI")).toBe("openai");
  });

  it("countOffersForUser returns count", async () => {
    const { client, builder } = makeSupabase({});
    const eqFn = vi.fn().mockResolvedValueOnce({ count: 3, data: null, error: null });
    builder.select = vi.fn(() => ({ eq: eqFn })) as unknown as typeof builder.select;
    const n = await countOffersForUser(client, "user-1");
    expect(n).toBe(3);
    expect(builder.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(eqFn).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("countOffersForUser returns 0 when count is null", async () => {
    const { client, builder } = makeSupabase({});
    builder.select = vi.fn(() => ({
      eq: vi.fn().mockResolvedValueOnce({ count: null, data: null, error: null }),
    })) as unknown as typeof builder.select;
    expect(await countOffersForUser(client, "user-1")).toBe(0);
  });

  it("countOffersForUser throws on error", async () => {
    const { client, builder } = makeSupabase({});
    builder.select = vi.fn(() => ({
      eq: vi.fn().mockResolvedValueOnce({ count: null, data: null, error: { message: "boom" } }),
    })) as unknown as typeof builder.select;
    await expect(countOffersForUser(client, "user-1")).rejects.toThrow(/boom/);
  });

  it("insertOffer returns inserted row", async () => {
    const row = { id: "off-1", user_id: "user-1", company_name: "Acme" };
    const { client, builder } = makeSupabase({});
    const singleFn = vi.fn().mockResolvedValueOnce({ data: row, error: null });
    builder.insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: singleFn })),
    })) as unknown as typeof builder.insert;
    const out = await insertOffer(client, {
      userId: "user-1",
      companyName: "Acme",
      role: "SWE Intern",
      location: "NYC",
      base: 120000,
    });
    expect(out.id).toBe("off-1");
    // Verifies defaults applied:
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        company_name: "Acme",
        role: "SWE Intern",
        location: "NYC",
        base: 120000,
        bonus: 0, equity: 0, sign_on: 0, housing: 0,
        application_id: null, level: null, start_date: null, deadline_at: null,
        benefits: {},
      }),
    );
  });

  it("getOfferById returns null when not found", async () => {
    const { client, builder } = makeSupabase({});
    builder.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
        })),
      })),
    })) as unknown as typeof builder.select;
    const offer = await getOfferById(client, "user-1", "off-x");
    expect(offer).toBeNull();
  });

  it("getOfferById returns row when found", async () => {
    const row = { id: "off-1", user_id: "u1" };
    const { client, builder } = makeSupabase({});
    builder.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: row, error: null }),
        })),
      })),
    })) as unknown as typeof builder.select;
    const offer = await getOfferById(client, "u1", "off-1");
    expect(offer?.id).toBe("off-1");
  });

  it("updateOfferStatus sets status + updated_at", async () => {
    const { client, builder } = makeSupabase({});
    const capture: Array<Record<string, unknown>> = [];
    builder.update = vi.fn((patch: Record<string, unknown>) => {
      capture.push(patch);
      return {
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
        })),
      };
    }) as unknown as typeof builder.update;
    await updateOfferStatus(client, "user-1", "off-1", "negotiating");
    expect(capture[0].status).toBe("negotiating");
    expect(typeof capture[0].updated_at).toBe("string");
  });

  it("getOffersForUser applies ordering + optional limit", async () => {
    const { client, builder } = makeSupabase({});
    const limitFn = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const orderFn = vi.fn(() => ({ limit: limitFn, then: undefined }));
    // emulate the chain: select().eq().order() returning a thenable when no limit,
    // or a chainable with limit when limit is applied
    builder.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        order: orderFn,
      })),
    })) as unknown as typeof builder.select;
    // With a limit arg:
    await getOffersForUser(client, "u1", { limit: 5 });
    expect(orderFn).toHaveBeenCalledWith("received_at", { ascending: false });
    expect(limitFn).toHaveBeenCalledWith(5);
  });
});
