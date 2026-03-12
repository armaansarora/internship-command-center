import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outreachQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { OutreachRejectRequest } from "@/contracts/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  // Validate but we don't strictly require a reason
  OutreachRejectRequest.safeParse(body);

  await db
    .update(outreachQueue)
    .set({ status: "rejected" })
    .where(eq(outreachQueue.id, id));

  return NextResponse.json({ success: true, outreachId: id, status: "rejected" });
}
