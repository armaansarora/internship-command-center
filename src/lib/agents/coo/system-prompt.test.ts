import { describe, expect, it } from "vitest";
import { buildCOOSystemPrompt } from "./system-prompt";
import type { BriefingData } from "@/lib/db/queries/communications-rest";

const EMPTY_BRIEFING: BriefingData = {
  overdueFollowUpsCount: 0,
  todaysInterviews: [],
  unreadEmailsCount: 0,
  pendingOutreachCount: 0,
};

describe("buildCOOSystemPrompt", () => {
  it("routes email questions through the synced Gmail ledger instead of denying visibility", () => {
    const prompt = buildCOOSystemPrompt(EMPTY_BRIEFING, "Armaan", []);

    expect(prompt).toContain("ALWAYS call checkEmails");
    expect(prompt).toContain("synced Gmail ledger");
    expect(prompt).toContain("recommend running Sync Gmail from Settings");
    expect(prompt).not.toContain("whatever client you're running");
  });
});
