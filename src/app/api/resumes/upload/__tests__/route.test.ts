/**
 * POST /api/resumes/upload route tests.
 *
 * Covers the hard partner constraints:
 *   - 401 when unauthenticated
 *   - 503 bucket_unprovisioned when the probe fails (never fall back
 *     to public URL)
 *   - 400 invalid_file_type for non-PDF
 *   - 413 file_too_large for > 10MB
 *   - 200 happy path with row insertion + signed URL never minted
 *     during the upload itself (signed URL is fetched via a different
 *     route; the upload response only returns metadata)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — order matters for vitest hoisting.
// ---------------------------------------------------------------------------

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
}));

const probeResumesBucketMock = vi.fn();
const insertBaseResumeMock = vi.fn();
vi.mock("@/lib/db/queries/base-resumes-rest", () => ({
  probeResumesBucket: () => probeResumesBucketMock(),
  insertBaseResume: (input: unknown) => insertBaseResumeMock(input),
}));

const parseResumePdfMock = vi.fn();
vi.mock("@/lib/resumes/parse", async () => {
  const actual = await vi.importActual<typeof import("@/lib/resumes/parse")>(
    "@/lib/resumes/parse",
  );
  return {
    ...actual,
    parseResumePdf: (buf: ArrayBuffer) => parseResumePdfMock(buf),
  };
});

const storageUploadMock = vi.fn();
const storageRemoveMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({
        upload: (path: string, data: Uint8Array, opts: unknown) =>
          storageUploadMock(path, data, opts),
        remove: (paths: string[]) => storageRemoveMock(paths),
      }),
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Must be imported AFTER mocks so the module picks them up.
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePdfFile(sizeBytes: number = 1024, name: string = "resume.pdf"): File {
  // Build a File whose reported type is application/pdf and whose byte
  // length matches sizeBytes. The route re-reads `type` and `size` from the
  // File object so the content doesn't need to be a real PDF for unit tests.
  const payload = new Uint8Array(sizeBytes);
  payload[0] = 0x25; // '%'
  payload[1] = 0x50; // 'P'
  payload[2] = 0x44; // 'D'
  payload[3] = 0x46; // 'F'
  return new File([payload], name, { type: "application/pdf" });
}

async function postUpload(file: File | null): Promise<Response> {
  const form = new FormData();
  if (file) form.append("file", file);
  const req = new Request("http://localhost/api/resumes/upload", {
    method: "POST",
    body: form,
  });
  return POST(req);
}

/**
 * Build a Request with an explicit Content-Length header that lies about the
 * payload size. Used to verify the size precheck rejects oversized requests
 * BEFORE Next.js's default body-size limit yields a misleading 400.
 */
function postUploadWithContentLength(
  file: File | null,
  contentLength: string,
): Promise<Response> {
  const form = new FormData();
  if (file) form.append("file", file);
  const req = new Request("http://localhost/api/resumes/upload", {
    method: "POST",
    body: form,
    headers: { "content-length": contentLength },
  });
  return POST(req);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/resumes/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      storagePath: "u/u-1/base-abc.pdf",
      originalFilename: "resume.pdf",
      fileSizeBytes: 1024,
      parsedText: "Jane Doe\n\nSoftware Engineer\n\nBuilt a thing.",
      pageCount: 1,
      isActive: true,
      createdAt: "2026-04-23T07:10:00.000Z",
      updatedAt: "2026-04-23T07:10:00.000Z",
    });
  });

  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await postUpload(makePdfFile());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 503 bucket_unprovisioned when storage bucket is not ready (NEVER falls back to public)", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    probeResumesBucketMock.mockResolvedValue(false);

    const res = await postUpload(makePdfFile());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("bucket_unprovisioned");
    // Critical: nothing was uploaded, nothing persisted.
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(insertBaseResumeMock).not.toHaveBeenCalled();
  });

  it("returns 400 invalid_file_type for non-PDF uploads", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const wrongType = new File(["hello"], "note.txt", { type: "text/plain" });
    const res = await postUpload(wrongType);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_file_type");
  });

  it("returns 413 file_too_large when file exceeds 10MB", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const oversized = makePdfFile(10_485_761);
    const res = await postUpload(oversized);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("file_too_large");
  });

  it("returns 400 missing_file when no file is attached", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await postUpload(null);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("missing_file");
  });

  it("returns 400 redos_risk when ReDoS guard rejects parsed text", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    parseResumePdfMock.mockResolvedValue({
      ok: false,
      error: { type: "redos_risk", reason: "pathological_long_token" },
    });
    const res = await postUpload(makePdfFile());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("redos_risk");
    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it("returns 400 too_many_pages when PDF exceeds the 50-page cap", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    parseResumePdfMock.mockResolvedValue({
      ok: false,
      error: { type: "too_many_pages", pages: 120 },
    });
    const res = await postUpload(makePdfFile());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("too_many_pages");
  });

  it("happy path — uploads PDF, inserts row, returns metadata", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await postUpload(makePdfFile(2048, "my-resume.pdf"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("r-1");
    expect(body.pageCount).toBe(1);
    expect(typeof body.parsedTextSample).toBe("string");
    expect(body.parsedTextSample.length).toBeLessThanOrEqual(240);
    expect(storageUploadMock).toHaveBeenCalledOnce();
    const [path, _data, opts] = storageUploadMock.mock.calls[0];
    expect(path).toMatch(/^u\/u-1\/base-.*\.pdf$/);
    expect((opts as { contentType?: string } | undefined)?.contentType).toBe(
      "application/pdf",
    );
    expect(insertBaseResumeMock).toHaveBeenCalledOnce();
  });

  it("returns 413 file_too_large via Content-Length precheck (NOT 400 invalid_multipart)", async () => {
    // Regression: a 50MB upload used to hit Next.js's body-size guard before
    // the route's file-size check, surfacing as a misleading 400
    // invalid_multipart. The Content-Length precheck must intercept it and
    // return 413 file_too_large so users get an accurate error.
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await postUploadWithContentLength(
      makePdfFile(1024),
      "50000000",
    );
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("file_too_large");
    // Critical: the precheck fires before formData() parsing, so nothing was
    // uploaded or persisted.
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(insertBaseResumeMock).not.toHaveBeenCalled();
  });

  it("falls through when Content-Length is missing (chunked transfer)", async () => {
    // Some clients omit Content-Length for chunked transfers. The precheck
    // must not crash; the existing file-size check inside formData() handles
    // the size guard.
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await postUpload(makePdfFile(1024));
    expect(res.status).toBe(200);
  });

  it("falls through when Content-Length is malformed", async () => {
    // Defensive: non-numeric Content-Length must not crash the route.
    getUserMock.mockResolvedValue({ id: "u-1" });
    const res = await postUploadWithContentLength(
      makePdfFile(1024),
      "not-a-number",
    );
    // Should fall through to the formData parse + normal flow.
    expect(res.status).toBe(200);
  });

  it("cleans up orphaned blob if row insertion fails", async () => {
    getUserMock.mockResolvedValue({ id: "u-1" });
    insertBaseResumeMock.mockResolvedValue(null);
    const res = await postUpload(makePdfFile());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("persist_failed");
    expect(storageRemoveMock).toHaveBeenCalledOnce();
  });
});
