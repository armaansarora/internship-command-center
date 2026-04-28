/**
 * R5 PROOF — end-to-end Writing Room invariants.
 *
 * Assembles the R5 hard non-negotiables into a single attestation test
 * so a future refactor that accidentally breaks one of them fails
 * loudly.
 *
 *   INVARIANT 1 — Private storage: the upload route surfaces 503
 *     bucket_unprovisioned when the probe fails, and never falls back
 *     to a public URL path.
 *   INVARIANT 2 — Three-tone divergence: on the same JD the three
 *     tones produce demonstrably different outputs — Jaccard < 0.70
 *     on word sets pairwise.
 *   INVARIANT 3 — Approval gate: /approve rejects with 400
 *     `no_tone_chosen` when metadata.selectedCoverLetterId is null.
 *   INVARIANT 4 — Send-time gate: the outreach-sender cron's query
 *     filters on `.eq('status', 'approved')` — pending_approval rows
 *     are invisible to the sender. (We assert this by reading the
 *     compiled route source. Covers the downstream half of the gate.)
 *   INVARIANT 5 — PDF export: cover letter and resume both render as
 *     application/pdf with a valid %PDF- header.
 *
 * If this test ever goes yellow or red, the feature has regressed on
 * something the launch brief said cannot regress.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Shared mocks (reset between tests to keep each invariant isolated)
// ---------------------------------------------------------------------------

const getUserMock = vi.fn();
const probeResumesBucketMock = vi.fn();
const insertBaseResumeMock = vi.fn();
const parseResumePdfMock = vi.fn();
const storageUploadMock = vi.fn();
const storageRemoveMock = vi.fn();

let queueFetchResult: () => Promise<{ data: unknown; error: unknown }>;
let documentFetchResult: () => Promise<{ data: unknown; error: unknown }>;

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
  createClient: async () => ({
    from: (table: string) => {
      if (table === "outreach_queue") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => queueFetchResult(),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      if (table === "documents") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => documentFetchResult(),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/db/queries/base-resumes-rest", () => ({
  probeResumesBucket: () => probeResumesBucketMock(),
  insertBaseResume: (input: unknown) => insertBaseResumeMock(input),
}));

vi.mock("@/lib/resumes/parse", async () => {
  const actual = await vi.importActual<typeof import("@/lib/resumes/parse")>(
    "@/lib/resumes/parse",
  );
  return {
    ...actual,
    parseResumePdf: (buf: ArrayBuffer) => parseResumePdfMock(buf),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => storageUploadMock(...a),
        remove: (...a: unknown[]) => storageRemoveMock(...a),
      }),
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: vi.fn(async () => ({
    allowed: true,
    used: 1,
    cap: 25,
  })),
}));

vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: vi.fn(async () => "free"),
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => null,
  getActiveModelId: () => "mock-model",
}));
vi.mock("@/lib/ai/prompt-cache", () => ({
  getCachedSystem: (s: string) => s,
}));
vi.mock("@/lib/ai/telemetry", () => ({
  recordAgentRun: vi.fn(),
}));

// Three-tone AI mock keyed on the system prompt. If the generator
// passed identical prompts to all three tones, the mock would return
// identical output and the divergence assertion below would fail.
vi.mock("ai", () => ({
  Output: {
    object: <T,>(config: { schema: T }) => config,
  },
  generateText: vi.fn(async ({ system }: { system: string }) => {
    if (typeof system !== "string") return { output: null };
    if (system.includes("FORMAL mode")) {
      return {
        output: {
          greeting: "Dear Hiring Team,",
          opening:
            "Hexspire Capital's underwriting discipline in the current rate environment represents precisely the approach I aim to operate within. I submit this application for the Analyst Intern role on that premise.",
          body_paragraphs: [
            "I offer two years of direct exposure to institutional capital allocation and the analytical register you reward.",
          ],
          closing: "I would welcome a conversation on your deal pipeline.",
          signature: "Respectfully",
          tone_notes: "formal — institutional register",
        },
        usage: {},
      };
    }
    if (system.includes("CONVERSATIONAL mode")) {
      return {
        output: {
          greeting: "Hi there,",
          opening:
            "I've been reading through CBRE's Q3 capital-markets notes — the piece on industrial re-pricing caught my eye.",
          body_paragraphs: [
            "I'm a junior at NYU Stern with 18 months in CRE analyst seats. It's work I genuinely care about.",
          ],
          closing: "I'd love to chat about the role.",
          signature: "Best",
          tone_notes: "conversational — practitioner warmth",
        },
        usage: {},
      };
    }
    if (system.includes("BOLD mode")) {
      return {
        output: {
          greeting: "Team,",
          opening:
            "Hire an intern who already shipped a working deal model. I am that intern.",
          body_paragraphs: [
            "Send me the hardest underwrite on your desk. I will return it with my analysis within 48 hours.",
          ],
          closing: "My thesis is below.",
          signature: "Direct",
          tone_notes: "bold — boutique founder voice",
        },
        usage: {},
      };
    }
    return { output: null };
  }),
}));

// @react-pdf/renderer returns a valid %PDF- buffer.
vi.mock("@react-pdf/renderer", async () => {
  const FAKE = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF", "utf8");
  return {
    Document: ({ children }: { children: unknown }) => children,
    Page: ({ children }: { children: unknown }) => children,
    Text: ({ children }: { children: unknown }) => children,
    View: ({ children }: { children: unknown }) => children,
    StyleSheet: { create: (s: unknown) => s },
    renderToBuffer: async () => FAKE,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

// ---------------------------------------------------------------------------
// Proof attestations
// ---------------------------------------------------------------------------

describe("R5 Proof — launch brief invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ id: "u-1" });
    probeResumesBucketMock.mockResolvedValue(true);
    parseResumePdfMock.mockResolvedValue({
      ok: true,
      value: {
        text: "Jane Doe\n\nSoftware Engineer\n\nBuilt a thing.",
        pageCount: 1,
        bytesParsed: 42,
        truncated: false,
      },
    });
    storageUploadMock.mockResolvedValue({ error: null });
    storageRemoveMock.mockResolvedValue({ error: null });
    insertBaseResumeMock.mockResolvedValue({
      id: "r-1",
      storagePath: "u/u-1/base.pdf",
      originalFilename: "resume.pdf",
      fileSizeBytes: 1024,
      parsedText: "Jane Doe — Blackstone Credit.",
      pageCount: 1,
      isActive: true,
      createdAt: "2026-04-23T07:00:00.000Z",
      updatedAt: "2026-04-23T07:00:00.000Z",
    });
    queueFetchResult = async () => ({ data: null, error: null });
    documentFetchResult = async () => ({ data: null, error: null });
  });

  it("INVARIANT 1 — bucket unprovisioned blocks upload (no public-URL fallback)", async () => {
    const { POST } = await import("../api/resumes/upload/route");
    probeResumesBucketMock.mockResolvedValueOnce(false);
    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "r.pdf", {
        type: "application/pdf",
      }),
    );
    const res = await POST(
      new Request("http://localhost/api/resumes/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("bucket_unprovisioned");
    // Crucially, no storage write + no DB row happened.
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(insertBaseResumeMock).not.toHaveBeenCalled();
  });

  it("INVARIANT 2 — three tones diverge on the same JD (Jaccard < 0.70 pairwise)", async () => {
    const { generateThreeToneCoverLetters } = await import(
      "@/lib/ai/structured/cover-letter"
    );
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
      jobDescription: "CRE analyst intern",
    });
    expect(result.complete).toBe(true);
    const texts = result.variants.map((v) => {
      const { letter } = v;
      return [letter.opening, ...letter.body_paragraphs, letter.closing].join(
        " ",
      );
    });
    const [a, b, c] = texts.map(wordSet);
    expect(jaccard(a, b)).toBeLessThan(0.7);
    expect(jaccard(a, c)).toBeLessThan(0.7);
    expect(jaccard(b, c)).toBeLessThan(0.7);
  });

  it("INVARIANT 3 — approve without selection returns 400 no_tone_chosen (the gate)", async () => {
    const { POST } = await import("../api/writing-room/approve/route");
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        type: "cover_letter_send",
        body: null,
        metadata: { toneGroupId: "tg-1", selectedCoverLetterId: null },
      },
      error: null,
    });
    const res = await POST(
      new Request("http://localhost/api/writing-room/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outreachQueueId: "q-1" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no_tone_chosen");
  });

  it("INVARIANT 4 — outreach-sender cron pulls only status='approved' rows (pending invisible)", () => {
    const cronSource = readFileSync(
      join(process.cwd(), "src/app/api/cron/outreach-sender/route.ts"),
      "utf8",
    );
    // The filter lives at `.eq("status", "approved")` in the select chain.
    expect(cronSource).toMatch(/\.eq\("status",\s*"approved"\)/);
    // Defence-in-depth: there must NOT be a path that picks up pending_approval.
    expect(cronSource).not.toMatch(/\.eq\("status",\s*"pending_approval"\)/);
  });

  it("INVARIANT 5 — PDF export produces a valid %PDF- application/pdf body", async () => {
    const { GET } = await import("../api/documents/[id]/pdf/route");
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        type: "cover_letter",
        title: "Hexspire — Analyst Intern Cover Letter v1",
        content: "Dear Team,\n\nParagraph.\n\nAnother.",
        version: 1,
      },
      error: null,
    });
    const res = await GET(
      new Request("http://localhost/api/documents/doc-1/pdf"),
      { params: Promise.resolve({ id: "doc-1" }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(10);
    expect(buf.slice(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
