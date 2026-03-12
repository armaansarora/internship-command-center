import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outreachQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { auth } from "@/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const now = new Date().toISOString();

  await db
    .update(outreachQueue)
    .set({ status: "approved", approvedAt: now })
    .where(eq(outreachQueue.id, id));

  await inngest.send({
    name: "outreach/approved",
    data: { outreachId: id, approvedAt: now },
  });

  return NextResponse.json({ success: true, outreachId: id, status: "approved" });
}
