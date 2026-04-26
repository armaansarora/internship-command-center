/**
 * GET /api/resumes/signed-url/[id]
 *
 * Mints a short-lived signed URL (1 hour) for a base resume's stored PDF.
 * The calling user must own the row; RLS + the getBaseResumeById check
 * enforce that. The admin client bypasses RLS on storage.objects, which
 * is why the ownership check via the user-scoped REST query must happen
 * first.
 *
 * This is the only path the UI fetches the PDF through. No public URL is
 * ever generated — non-negotiable per the R5 brief.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  getBaseResumeById,
  mintSignedUrlForBaseResume,
} from "@/lib/db/queries/base-resumes-rest";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const row = await getBaseResumeById(user.id, id);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const signedUrl = await mintSignedUrlForBaseResume(row.storagePath, 3600);
  if (!signedUrl) {
    return NextResponse.json(
      { error: "sign_failed", message: "Could not mint signed URL." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: row.id,
      filename: row.originalFilename,
      signedUrl,
      ttlSeconds: 3600,
    },
    { status: 200 },
  );
}
