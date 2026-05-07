import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.hoisted(() => vi.fn(async () => ({ id: "user-1" })));
vi.mock("@/lib/supabase/server", () => ({
  getUser: getUserMock,
}));

const getBaseResumeByIdMock = vi.hoisted(() => vi.fn());
const mintSignedUrlMock = vi.hoisted(() => vi.fn(async () => "https://signed.example/resume"));
vi.mock("@/lib/db/queries/base-resumes-rest", () => ({
  getBaseResumeById: getBaseResumeByIdMock,
  mintSignedUrlForBaseResume: mintSignedUrlMock,
}));

import { GET } from "./route";

const ctx = { params: Promise.resolve({ id: "resume-1" }) };

describe("GET /api/resumes/signed-url/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ id: "user-1" });
    mintSignedUrlMock.mockResolvedValue("https://signed.example/resume");
  });

  it("404s without minting when the stored path is outside the user's folder", async () => {
    getBaseResumeByIdMock.mockResolvedValue({
      id: "resume-1",
      originalFilename: "resume.pdf",
      storagePath: "u/user-2/base-known.pdf",
    });

    const res = await GET(new Request("http://localhost/api/resumes/signed-url/resume-1"), ctx);

    expect(res.status).toBe(404);
    expect(mintSignedUrlMock).not.toHaveBeenCalled();
  });

  it("mints a signed URL for a row whose path belongs to the user", async () => {
    getBaseResumeByIdMock.mockResolvedValue({
      id: "resume-1",
      originalFilename: "resume.pdf",
      storagePath: "u/user-1/base-abc.pdf",
    });

    const res = await GET(new Request("http://localhost/api/resumes/signed-url/resume-1"), ctx);

    expect(res.status).toBe(200);
    expect(mintSignedUrlMock).toHaveBeenCalledWith("u/user-1/base-abc.pdf", 3600);
  });
});
