import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const logs = await db
    .select()
    .from(agentLogs)
    .where(
      and(
        eq(agentLogs.agent, "ceo"),
        eq(agentLogs.action, "briefing-compile"),
        eq(agentLogs.status, "completed")
      )
    );

  for (const log of logs) {
    try {
      const briefing = JSON.parse(log.outputSummary ?? "{}");
      if (briefing.briefingId === id) {
        return NextResponse.json(briefing);
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
}
