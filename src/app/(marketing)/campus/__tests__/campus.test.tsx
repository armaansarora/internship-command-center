/**
 * Campus pilot landing-page tests.
 *
 * Covers:
 *   - The static page renders the pitch sections + the contact form.
 *   - submitCampusInquiry validates required fields and surfaces field errors.
 *   - submitCampusInquiry sends email + writes the audit row on the happy path.
 *
 * Resend + Supabase are mocked so the server action runs without I/O. The
 * mocks live at the top so vi.mock hoisting kicks in before the imports.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const supabaseInsertSpy = vi.fn();
const resendSendSpy = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: supabaseInsertSpy,
    }),
  }),
}));

vi.mock("resend", () => {
  class MockResend {
    emails: { send: typeof resendSendSpy };
    constructor() {
      this.emails = { send: resendSendSpy };
    }
  }
  return { Resend: MockResend };
});

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "vitest",
    }),
}));

vi.mock("@/lib/env", async () => ({
  requireEnv: (_keys: ReadonlyArray<string>) => ({
    RESEND_API_KEY: "re_test_key",
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkInMemoryRateLimit: () => ({ success: true, limit: 3, remaining: 2 }),
}));

vi.mock("@/lib/logger", () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import CampusPage from "../page";
import { submitCampusInquiry, type CampusInquiryInput } from "../actions";

const goodInput: CampusInquiryInput = {
  schoolName: "Cornell University",
  contactName: "Jane Doe",
  role: "Director of Career Services",
  email: "jane@example.edu",
  studentCount: "2000-5000",
  intakeSeason: "fall-2026",
  notes: "We run a structured pipeline program each fall.",
};

describe("CampusPage (static markup)", () => {
  it("renders the hero, the pitch sections, and the contact form", () => {
    const html = renderToStaticMarkup(<CampusPage />);

    expect(html).toContain("Tower for Campus Career Centers");
    expect(html).toContain("Counselor visibility");
    expect(html).toContain("Outcome reporting");
    expect(html).toContain("Cohort matching");
    expect(html).toContain("Pilots from $1,500");
    expect(html).toContain("Tell us about your program");
    expect(html).toContain("data-testid=\"campus-inquiry-form\"");

    // Each form field has an explicit <label> wired to its <input> id.
    expect(html).toContain("for=\"schoolName\"");
    expect(html).toContain("for=\"contactName\"");
    expect(html).toContain("for=\"role\"");
    expect(html).toContain("for=\"email\"");
    expect(html).toContain("for=\"studentCount\"");
    expect(html).toContain("for=\"intakeSeason\"");
  });
});

describe("submitCampusInquiry (server action)", () => {
  beforeEach(() => {
    supabaseInsertSpy.mockReset();
    resendSendSpy.mockReset();
    supabaseInsertSpy.mockResolvedValue({ error: null });
    resendSendSpy.mockResolvedValue({ data: { id: "mock-resend-id" }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("happy path: inserts the audit row and sends the founder email", async () => {
    const result = await submitCampusInquiry(goodInput);

    expect(result.ok).toBe(true);
    expect(supabaseInsertSpy).toHaveBeenCalledTimes(1);
    const auditCall = supabaseInsertSpy.mock.calls[0]?.[0];
    expect(auditCall).toMatchObject({
      user_id: null,
      event_type: "campus_pilot_inquiry",
      resource_type: "campus_pilot",
      metadata: expect.objectContaining({
        school_name: "Cornell University",
        student_count: "2000-5000",
        intake_season: "fall-2026",
      }),
    });
    // PII stays out of the durable audit row — it lives in Resend only.
    const auditMetadata = auditCall.metadata as Record<string, unknown>;
    expect(auditMetadata).not.toHaveProperty("contact_name");
    expect(auditMetadata).not.toHaveProperty("email");
    expect(auditMetadata).not.toHaveProperty("role");
    expect(auditMetadata).not.toHaveProperty("notes");

    expect(resendSendSpy).toHaveBeenCalledTimes(1);
    const sendArgs = resendSendSpy.mock.calls[0]?.[0] as {
      subject: string;
      to: string;
      replyTo?: string;
    };
    expect(sendArgs.subject).toContain("Cornell University");
    expect(sendArgs.subject).toContain("Jane Doe");
    expect(sendArgs.replyTo).toBe("jane@example.edu");
  });

  it("validation: rejects an empty school name with a field-level error", async () => {
    const bad: CampusInquiryInput = { ...goodInput, schoolName: "" };

    const result = await submitCampusInquiry(bad);

    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.fieldErrors?.schoolName).toBeTruthy();
    expect(supabaseInsertSpy).not.toHaveBeenCalled();
    expect(resendSendSpy).not.toHaveBeenCalled();
  });

  it("validation: rejects an invalid email", async () => {
    const bad: CampusInquiryInput = { ...goodInput, email: "not-an-email" };

    const result = await submitCampusInquiry(bad);

    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.fieldErrors?.email).toBeTruthy();
  });

  it("resilience: audit failure does NOT abort the lead — email still sends", async () => {
    supabaseInsertSpy.mockResolvedValueOnce({
      error: { code: "23514", message: "check constraint failed" },
    });

    const result = await submitCampusInquiry(goodInput);

    expect(result.ok).toBe(true);
    expect(resendSendSpy).toHaveBeenCalledTimes(1);
  });

  it("failure path: Resend error surfaces a user-facing error", async () => {
    resendSendSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "deliverability failure" },
    });

    const result = await submitCampusInquiry(goodInput);

    if (result.ok) {
      throw new Error("expected Resend failure to bubble up");
    }
    expect(result.error.toLowerCase()).toContain("delivery failed");
  });
});
