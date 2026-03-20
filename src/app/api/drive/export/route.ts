import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getDocumentById } from "@/lib/db/queries/documents-rest";
import { exportDocumentToDrive } from "@/lib/utils/google-drive-export";

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const body = (await req.json()) as { documentId: string };
  const { documentId } = body;

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  const document = await getDocumentById(user.id, documentId);

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
