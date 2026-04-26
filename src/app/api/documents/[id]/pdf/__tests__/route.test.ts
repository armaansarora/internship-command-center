/**
 * GET /api/documents/[id]/pdf route tests.
 *
 * Scoped to the route-layer behavior: ownership, type gating, error
 * translation, and the happy-path contract (application/pdf, non-empty
 * body, %PDF- header). The @react-pdf/renderer engine is mocked so
 * tests stay deterministic and fast.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.fn();

let documentFetchResult: () => Promise<{ data: unknown; error: unknown }>;

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => documentFetchResult(),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Stub @react-pdf/renderer so the route test doesn't spin up the real
// renderer (too slow + too heavy for a unit test). The important bit
// for the test is the Content-Type + %PDF- sniff on the returned
// buffer, so we make the mock return a minimal well-formed PDF header.
vi.mock("@react-pdf/renderer", async () => {
  const FAKE_PDF_BUFFER = Buffer.from(
    "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF",
    "utf8",
  );
  return {
    Document: ({ children }: { children: unknown }) => children,
    Page: ({ children }: { children: unknown }) => children,
    Text: ({ children }: { children: unknown }) => children,
    View: ({ children }: { children: unknown }) => children,
    StyleSheet: { create: (s: unknown) => s },
    renderToBuffer: async () => FAKE_PDF_BUFFER,
  };
});

import { GET } from "../route";

async function getPdf(id: string): Promise<Response> {
  const req = new Request(`http://localhost/api/documents/${id}/pdf`);
  return GET(req, { params: Promise.resolve({ id }) });
}

describe("GET /api/documents/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ id: "u-1" });
    documentFetchResult = async () => ({ data: null, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await getPdf("doc-1");
    expect(res.status).toBe(401);
  });

  it("returns 404 when the document doesn't belong to the user (RLS)", async () => {
    documentFetchResult = async () => ({ data: null, error: null });
    const res = await getPdf("doc-1");
    expect(res.status).toBe(404);
  });

  it("returns 400 for an unsupported document type", async () => {
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        type: "prep_packet",
        title: "Prep Packet — Hexspire",
        content: "Some content",
        version: 1,
      },
      error: null,
    });
    const res = await getPdf("doc-1");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("unsupported_type");
  });

  it("returns 400 when content is empty", async () => {
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        type: "cover_letter",
        title: "Hexspire — Analyst Intern Cover Letter v1",
        content: "",
        version: 1,
      },
      error: null,
    });
    const res = await getPdf("doc-1");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("empty_content");
  });

  it("happy path — cover letter renders as application/pdf with %PDF- header", async () => {
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        type: "cover_letter",
        title: "Hexspire — Analyst Intern Cover Letter v1",
        content: "Dear Team,\n\nParagraph one.\n\nParagraph two.",
        version: 1,
      },
      error: null,
    });
    const res = await getPdf("doc-1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toMatch(/^attachment;/);
    expect(disposition).toMatch(/\.pdf"/);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(10);
    expect(buf.slice(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("happy path — resume renders as application/pdf", async () => {
    documentFetchResult = async () => ({
      data: {
        id: "doc-r1",
        type: "resume_tailored",
        title: "Hexspire — Resume v1",
        content: "# Jane Doe\n\njane@example.com\n\n## Summary\n\nFocused candidate.\n",
        version: 1,
      },
      error: null,
    });
    const res = await getPdf("doc-r1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.slice(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("never caches the PDF (Cache-Control: private, no-store)", async () => {
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        type: "cover_letter",
        title: "Doc",
        content: "Content.",
        version: 1,
      },
      error: null,
    });
    const res = await getPdf("doc-1");
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });
});
