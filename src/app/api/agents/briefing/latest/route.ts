import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [latest] = await db
    .select()
    .from(agentLogs)
    .where(
      and(
        eq(agentLogs.agent, "ceo"),
        eq(agentLogs.action, "briefing-compile"),
        eq(agentLogs.status, "completed")
      )
    )
    .orderBy(desc(agentLogs.completedAt))
    .limit(1);

  if (!latest?.outputSummary) {
    return NextResponse.json(null);
  }

  try {
    const briefing = JSON.parse(latest.outputSummary);
    return NextResponse.json(briefing);
  } catch {
    return NextResponse.json(null);
  }
}
