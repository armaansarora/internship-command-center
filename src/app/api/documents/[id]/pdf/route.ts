/**
 * GET /api/documents/[id]/pdf
 *
 * Renders a document (cover_letter or resume_tailored) to a
 * publication-quality PDF and returns it with content-type
 * application/pdf. Ownership is RLS-enforced via the authenticated
 * Supabase server client.
 *
 * Implementation note: @react-pdf/renderer's server-side render is
 * invoked via `renderToBuffer`. The library is dynamic-imported so
 * Next.js build-time analysis doesn't try to bundle the PDF engine
 * into client chunks.
 */

import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { CoverLetterPdf } from "@/lib/pdf/cover-letter-pdf";
import { ResumePdf } from "@/lib/pdf/resume-pdf";
import { log } from "@/lib/logger";

export const maxDuration = 60;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

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

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, user_id, type, title, content, version, application_id")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("[documents/pdf] lookup failed", error, { userId: user.id, id });
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const type = doc.type as string | null;
  const title = (doc.title as string | null) ?? "Document";
  const content = (doc.content as string | null) ?? "";

  if (!["cover_letter", "resume_tailored"].includes(type ?? "")) {
    return NextResponse.json(
      { error: "unsupported_type", message: `PDF export supported only for cover_letter + resume_tailored; got ${type}.` },
      { status: 400 },
    );
  }

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "empty_content" }, { status: 400 });
  }

  // Dynamic import — pdf renderer pulls in a lot; we only want it on this
  // handler path, not on every request that touches this module graph.
  const pdfLib = await import("@react-pdf/renderer");

  const pdfComponent =
    type === "cover_letter"
      ? CoverLetterPdf({ title, content })
      : ResumePdf({ title, content });

  let buffer: Buffer;
  try {
    const nodeBuffer = await pdfLib.renderToBuffer(pdfComponent);
    buffer = nodeBuffer as unknown as Buffer;
  } catch (err) {
    log.error("[documents/pdf] renderToBuffer failed", err, {
      userId: user.id,
      id,
      type,
    });
    return NextResponse.json(
      { error: "render_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const filename = `${slugify(title)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
