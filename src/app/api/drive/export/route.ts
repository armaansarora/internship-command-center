import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { getDocumentById } from "@/lib/db/queries/documents-rest";
import { exportDocumentToDrive } from "@/lib/utils/google-drive-export";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;

  const body = (await req.json()) as { documentId: string };
  const { documentId } = body;

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400, headers: rate.headers }
    );
  }

  const document = await getDocumentById(user.id, documentId);

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404, headers: rate.headers }
    );
  }

  try {
    const result = await exportDocumentToDrive(user.id, {
      title: document.title ?? "Untitled Document",
      content: document.content ?? "",
      type: document.type ?? "cover_letter",
    });

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    }, { headers: rate.headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: rate.headers }
    );
  }
}
