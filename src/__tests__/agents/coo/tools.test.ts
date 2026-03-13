import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "mock-token" }),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    gmail: vi.fn().mockReturnValue({
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({ data: { messages: [] } }),
          get: vi.fn(),
        },
      },
    }),
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: vi.fn().mockResolvedValue({
          data: { id: "gcal-1", htmlLink: "https://calendar.google.com/event/gcal-1" },
        }),
      },
    }),
  },
}));

describe("COO Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifyEmail stores metadata and returns classification", async () => {
    // Mock: no existing email found
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "email-1" }]),
      }),
    });

    const { classifyEmail } = await import("@/lib/agents/coo/tools");
    const result = await classifyEmail({
      gmailId: "gmail-123",
      threadId: "thread-456",
      subject: "Interview Invitation - Software Engineer",
      from: "recruiter@company.com",
      snippet: "We would like to invite you...",
      bodyText: "Dear candidate, we would like to invite you for an interview.",
      classification: "interview_invite",
      urgency: "high",
      suggestedAction: "Schedule interview",
    });

    expect(result.classification).toBe("interview_invite");
    expect(result.urgency).toBe("high");
    expect(result.alreadyProcessed).toBe(false);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("classifyEmail returns existing classification if already processed", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              gmailId: "gmail-123",
              classification: "rejection",
              urgency: "low",
              suggestedAction: "Archive",
              applicationId: "app-1",
            },
          ]),
        }),
      }),
    });

    const { classifyEmail } = await import("@/lib/agents/coo/tools");
    const result = await classifyEmail({
      gmailId: "gmail-123",
      threadId: "thread-456",
      subject: "Update on your application",
      from: "hr@company.com",
      snippet: "Unfortunately...",
      bodyText: "Unfortunately we have decided...",
    });

    expect(result.classification).toBe("rejection");
    expect(result.alreadyProcessed).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("updateApplicationFromEmail updates status and links email", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { updateApplicationFromEmail } = await import(
      "@/lib/agents/coo/tools"
    );
    const result = await updateApplicationFromEmail({
      applicationId: "app-1",
      newStatus: "rejected",
      reason: "Rejection email received",
      emailGmailId: "gmail-789",
    });

    expect(result.success).toBe(true);
    expect(result.applicationId).toBe("app-1");
    expect(result.newStatus).toBe("rejected");
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});
