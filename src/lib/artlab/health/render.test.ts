import { describe, expect, it } from "vitest";
import { renderArtLabHealth } from "./render";

describe("renderArtLabHealth", () => {
  it("renders a plain-text report with section headings", () => {
    const text = renderArtLabHealth({
      collectedAt: "2026-05-20T00:00:00.000Z",
      workspaceRoot: "/x",
      leases: [],
      spend: { totalSpentCents: 1234, byRun: { r1: 1234 } },
      processes: { activeProcessCount: 1, runIds: ["r1"] },
      receipts: { totalReceipts: 4, byRun: { r1: 4 } },
      locks: { locks: [] },
      cleanup: { orphanPreviewCount: 0, staleBoardCount: 0, staleLockCount: 0 },
    });
    expect(text).toContain("ArtLab Health");
    expect(text).toContain("$12.34");
    expect(text).toContain("active processes: 1");
  });
});
