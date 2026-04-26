/**
 * POST /api/resumes/upload
 *
 * Accepts a multipart PDF upload, parses it, stores the binary in the
 * PRIVATE `resumes` bucket, and writes a base_resumes row with the
 * plain-text cache.
 *
 * Non-negotiables (per autopilot brief):
 *   1. Storage is PRIVATE; user never receives a public URL, only a
 *      short-lived signed URL minted by the service-role admin client.
 *   2. If the bucket isn't provisioned in this environment, return 503
 *      bucket_unprovisioned. Never fall back to public storage or skip
 *      the upload — escalate via blocker.
 *   3. ReDoS guard runs on parsed text before persistence.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  insertBaseResume,
  probeResumesBucket,
} from "@/lib/db/queries/base-resumes-rest";
import { parseResumePdf, MAX_FILE_BYTES } from "@/lib/resumes/parse";
import { log } from "@/lib/logger";

export const maxDuration = 60;

interface UploadSuccessResponse {
  id: string;
  filename: string;
  pageCount: number;
  parsedTextSample: string;
  truncated: boolean;
}

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Probe bucket first — surfaces the bucket_unprovisioned error clearly
  // before we bother parsing anything.
  const bucketReady = await probeResumesBucket();
  if (!bucketReady) {
    log.error(
      "[resumes/upload] resumes bucket not provisioned — migration 0014 not applied in this env",
      undefined,
      { userId: user.id },
    );
    return NextResponse.json(
      {
        error: "bucket_unprovisioned",
        message:
          "Storage is not ready. The operator needs to apply migration 0014 against this environment.",
      },
      { status: 503 },
    );
  }

  // Parse multipart form
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    log.warn("[resumes/upload] failed to parse multipart body", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: "multipart field 'file' is required" },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      {
        error: "invalid_file_type",
        message: `Expected application/pdf, got ${file.type || "unknown"}`,
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `File is ${file.size} bytes; limit is ${MAX_FILE_BYTES} bytes (10MB).`,
      },
      { status: 413 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "empty_file", message: "PDF is empty." },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();

  // Parse
  const parseResult = await parseResumePdf(buffer);
  if (!parseResult.ok) {
    const err = parseResult.error;
    log.warn("[resumes/upload] parse failed", {
      userId: user.id,
      errorType: err.type,
    });
    if (err.type === "redos_risk") {
      return NextResponse.json(
        {
          error: "redos_risk",
          reason: err.reason,
          message:
            "Resume content tripped the regex-DoS guard. Re-save the PDF from Word/Pages and retry.",
        },
        { status: 400 },
      );
    }
    if (err.type === "too_many_pages") {
      return NextResponse.json(
        {
          error: "too_many_pages",
          pages: err.pages,
          message: "Resumes over 50 pages aren't supported.",
        },
        { status: 400 },
      );
    }
    if (err.type === "empty_pdf") {
      return NextResponse.json(
        { error: "empty_pdf", message: "PDF contained no extractable text." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "parse_failed", message: err.message },
      { status: 400 },
    );
  }

  // Upload to private bucket
  const admin = getSupabaseAdmin();
  const storagePath = `u/${user.id}/base-${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(storagePath, new Uint8Array(buffer), {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    log.error("[resumes/upload] storage upload failed", uploadError, {
      userId: user.id,
      path: storagePath,
    });
    return NextResponse.json(
      { error: "upload_failed", message: uploadError.message },
      { status: 500 },
    );
  }

  // Persist row
  const filename = file.name || "resume.pdf";
  const row = await insertBaseResume({
    userId: user.id,
    storagePath,
    originalFilename: filename,
    fileSizeBytes: file.size,
    parsedText: parseResult.value.text,
    pageCount: parseResult.value.pageCount,
  });

  if (!row) {
    // Row insert failed — remove the orphaned blob.
    await admin.storage.from("resumes").remove([storagePath]).catch(() => {
      // Best-effort cleanup.
    });
    return NextResponse.json(
      { error: "persist_failed", message: "Uploaded but could not index." },
      { status: 500 },
    );
  }

  const payload: UploadSuccessResponse = {
    id: row.id,
    filename: row.originalFilename,
    pageCount: row.pageCount,
    parsedTextSample: row.parsedText.slice(0, 240),
    truncated: parseResult.value.truncated,
  };

  return NextResponse.json(payload, { status: 200 });
}
