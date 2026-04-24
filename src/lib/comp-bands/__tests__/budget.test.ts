import { describe, it, expect, vi } from "vitest";
import {
  currentMonthKey,
  FIRECRAWL_MONTHLY_LIMIT,
  FIRECRAWL_SAFETY_BUFFER,
  canScrapeThisMonth,
} from "../budget";

describe("comp-bands/budget", () => {
  it("currentMonthKey returns YYYY-MM for a given date", () => {
    expect(currentMonthKey(new Date("2026-04-15T12:00:00Z"))).toBe("2026-04");
    expect(currentMonthKey(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
  });

  it("limit - safety buffer is effective ceiling (450)", () => {
    expect(FIRECRAWL_MONTHLY_LIMIT).toBe(500);
    expect(FIRECRAWL_SAFETY_BUFFER).toBe(50);
    expect(FIRECRAWL_MONTHLY_LIMIT - FIRECRAWL_SAFETY_BUFFER).toBe(450);
  });

  it("canScrapeThisMonth returns false when count >= limit - buffer", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { scrape_count: 450 },
              error: null,
            }),
          })),
        })),
      })),
    };
    expect(
      await canScrapeThisMonth(
        mockClient as unknown as Parameters<typeof canScrapeThisMonth>[0],
      ),
    ).toBe(false);
  });

  it("canScrapeThisMonth returns true when count < limit - buffer", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { scrape_count: 449 },
              error: null,
            }),
          })),
        })),
      })),
    };
    expect(
      await canScrapeThisMonth(
        mockClient as unknown as Parameters<typeof canScrapeThisMonth>[0],
      ),
    ).toBe(true);
  });
});
