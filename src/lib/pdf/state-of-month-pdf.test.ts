/**
 * R9.8 — State of the Month PDF — component + helper tests.
 *
 * Mocks @react-pdf/renderer so the engine doesn't actually run in JSDOM.
 * Asserts:
 *   - the component is exported and accepts StateOfMonthPdfProps
 *   - generateStateOfMonthPdf calls renderToBuffer once
 *   - returned buffer starts with "%PDF-" (mocked)
 *   - the data shape is forwarded to the component
 *   - empty planetSnapshot doesn't crash
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const renderToBufferMock: ReturnType<
  typeof vi.fn<(tree: unknown) => Promise<Buffer>>
> = vi.fn(async () => Buffer.from("%PDF-1.4 mocked"));

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children: unknown }) => ({ __type: "Document", children }),
  Page: ({ children }: { children: unknown }) => ({ __type: "Page", children }),
  Text: ({ children }: { children: unknown }) => ({ __type: "Text", children }),
  View: ({ children }: { children: unknown }) => ({ __type: "View", children }),
  Svg: ({ children }: { children: unknown }) => ({ __type: "Svg", children }),
  Circle: ({ children }: { children: unknown }) => ({ __type: "Circle", children }),
  Line: ({ children }: { children: unknown }) => ({ __type: "Line", children }),
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: (tree: unknown) => renderToBufferMock(tree),
}));

import {
  StateOfMonthPdf,
  generateStateOfMonthPdf,
  type StateOfMonthData,
  type StateOfMonthPdfProps,
} from "./state-of-month-pdf";

function makeData(overrides: Partial<StateOfMonthData> = {}): StateOfMonthData {
  return {
    month: "2026-04",
    userName: "Armaan",
    stats: {
      total: 12,
      interviewsBooked: 4,
      offers: 1,
      rejections: 2,
      appliedToScreeningRate: 0.33,
      screeningToInterviewRate: 0.5,
      interviewToOfferRate: 0.25,
      weakestStage: "interview→offer",
      strongestStage: "screening→interview",
    },
    planetSnapshot: [
      { tier: 1, status: "applied", angleDeg: 30 },
      { tier: 2, status: "interviewing", angleDeg: 120 },
      { tier: 3, status: "offer", angleDeg: 240 },
      { tier: 4, status: "rejected", angleDeg: 300 },
    ],
    cfoNote: "12 new applications, 4 interviews booked. Watch interview→offer.",
    ...overrides,
  };
}

describe("StateOfMonthPdf component", () => {
  beforeEach(() => {
    renderToBufferMock.mockClear();
    renderToBufferMock.mockResolvedValue(Buffer.from("%PDF-1.4 mocked"));
  });

  it("is exported as a function and accepts StateOfMonthPdfProps", () => {
    const props: StateOfMonthPdfProps = { data: makeData() };
    const result = StateOfMonthPdf(props);
    // The mocked Document constructor returns a tagged object — just check it ran.
    expect(result).toBeTruthy();
  });

  it("renders without throwing on an empty planetSnapshot", () => {
    const props: StateOfMonthPdfProps = {
      data: makeData({ planetSnapshot: [] }),
    };
    expect(() => StateOfMonthPdf(props)).not.toThrow();
  });

  it("renders without throwing when both weakest/strongest stages are null", () => {
    const props: StateOfMonthPdfProps = {
      data: makeData({
        stats: {
          total: 0,
          interviewsBooked: 0,
          offers: 0,
          rejections: 0,
          appliedToScreeningRate: 0,
          screeningToInterviewRate: 0,
          interviewToOfferRate: 0,
          weakestStage: null,
          strongestStage: null,
        },
      }),
    };
    expect(() => StateOfMonthPdf(props)).not.toThrow();
  });
});

describe("generateStateOfMonthPdf helper", () => {
  beforeEach(() => {
    renderToBufferMock.mockClear();
    renderToBufferMock.mockResolvedValue(Buffer.from("%PDF-1.4 mocked"));
  });

  it("returns a buffer whose first 5 bytes are %PDF-", async () => {
    const buffer = await generateStateOfMonthPdf(makeData());
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("calls renderToBuffer exactly once", async () => {
    await generateStateOfMonthPdf(makeData());
    expect(renderToBufferMock).toHaveBeenCalledTimes(1);
  });

  it("does not crash on empty planetSnapshot", async () => {
    await expect(
      generateStateOfMonthPdf(makeData({ planetSnapshot: [] })),
    ).resolves.toBeDefined();
  });

  it("forwards a React element with the data wired through to renderToBuffer", async () => {
    const data = makeData({ userName: "TestUser" });
    await generateStateOfMonthPdf(data);
    expect(renderToBufferMock).toHaveBeenCalledTimes(1);
    const arg = renderToBufferMock.mock.calls[0]?.[0] as
      | { type?: unknown; props?: { title?: string; author?: string } }
      | undefined;
    // JSX compiles <Document title author>... to a React element where
    // `type` is the (mocked) Document component and `props` carries the
    // attributes we set in StateOfMonthPdf — including the user name.
    expect(arg).toBeTruthy();
    expect(typeof arg?.type).toBe("function");
    expect(arg?.props?.author).toBe("TestUser");
    expect(arg?.props?.title).toContain("State of the Month");
  });

  it("returns a buffer of non-zero length", async () => {
    const buffer = await generateStateOfMonthPdf(makeData());
    expect(buffer.length).toBeGreaterThan(5);
  });
});
