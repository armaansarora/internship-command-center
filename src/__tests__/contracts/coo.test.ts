import { describe, it, expect } from "vitest";
import {
  CooResultData,
  CooTools,
  EmailClassification,
} from "@/contracts/departments/coo";

describe("EmailClassification", () => {
  it("accepts valid classification values", () => {
    for (const c of [
      "interview_invite",
      "rejection",
      "offer",
      "newsletter",
      "other",
    ]) {
      expect(EmailClassification.parse(c)).toBe(c);
    }
  });

  it("rejects invalid classification", () => {
    expect(() => EmailClassification.parse("spam")).toThrow();
  });
});

describe("CooResultData", () => {
  it("parses valid COO result", () => {
    const result = CooResultData.parse({
      emailsSynced: 15,
      emailsClassified: [
        {
          gmailId: "gm-1",
          threadId: "th-1",
          subject: "Interview Invite",
          from: "recruiter@company.com",
          classification: "interview_invite",
          urgency: "high",
          suggestedAction: "Schedule interview",
        },
      ],
    });
    expect(result.emailsSynced).toBe(15);
    expect(result.emailsClassified).toHaveLength(1);
  });

  it("applies defaults for optional arrays", () => {
    const result = CooResultData.parse({ emailsSynced: 0 });
    expect(result.emailsClassified).toEqual([]);
    expect(result.calendarEventsCreated).toEqual([]);
    expect(result.statusUpdates).toEqual([]);
  });

  it("rejects invalid classification in emailsClassified", () => {
    expect(() =>
      CooResultData.parse({
        emailsSynced: 1,
        emailsClassified: [
          {
            gmailId: "gm-1",
            threadId: "th-1",
            subject: "X",
            from: "x@x.com",
            classification: "spam",
            urgency: "high",
          },
        ],
      })
    ).toThrow();
  });
});

describe("CooTools", () => {
  it("fetchRecentEmails defaults maxResults to 20", () => {
    const parsed = CooTools.fetchRecentEmails.shape.parameters.parse({});
    expect(parsed.maxResults).toBe(20);
  });

  it("classifyEmail requires all fields", () => {
    expect(() =>
      CooTools.classifyEmail.shape.parameters.parse({
        gmailId: "gm-1",
      })
    ).toThrow();
  });

  it("createCalendarEvent requires datetime fields", () => {
    const parsed = CooTools.createCalendarEvent.shape.parameters.parse({
      title: "Interview",
      startAt: "2026-03-15T10:00:00Z",
      endAt: "2026-03-15T11:00:00Z",
    });
    expect(parsed.title).toBe("Interview");
  });

  it("updateApplicationFromEmail requires all fields", () => {
    expect(() =>
      CooTools.updateApplicationFromEmail.shape.parameters.parse({
        applicationId: "app-1",
      })
    ).toThrow();
  });
});
