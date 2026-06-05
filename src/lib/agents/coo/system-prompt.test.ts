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

  // Regression for backlog #3: interview times must render in the user's IANA
  // timezone, not server UTC. 18:30Z is 2:30 PM in America/New_York (EDT).
  const briefingWithInterview = (userTimezone?: string): BriefingData => ({
    overdueFollowUpsCount: 0,
    todaysInterviews: [
      {
        id: "i1",
        applicationId: "a1",
        companyId: null,
        round: null,
        format: "screening",
        scheduledAt: "2026-06-04T18:30:00.000Z",
        durationMinutes: 45,
        location: null,
        interviewerName: null,
        status: "scheduled",
        calendarEventId: null,
        companyName: "JLL",
        role: "Analyst",
      },
    ],
    unreadEmailsCount: 0,
    pendingOutreachCount: 0,
    userTimezone,
  });

  it("renders today's interview time in the user's IANA timezone", () => {
    const prompt = buildCOOSystemPrompt(
      briefingWithInterview("America/New_York"),
      "Armaan",
      [],
    );
    expect(prompt).toContain("02:30 PM");
    expect(prompt).not.toContain("06:30 PM");
  });

  it("falls back to UTC when the user's timezone is unknown", () => {
    const prompt = buildCOOSystemPrompt(briefingWithInterview(undefined), "Armaan", []);
    expect(prompt).toContain("06:30 PM");
  });
});
