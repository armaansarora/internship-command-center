import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { BellRingRequest, BellRingResponse } from "@/contracts/api";
import { auth } from "@/auth";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = BellRingRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 }
    );
  }

  const executionId = randomHex();

  await inngest.send({
    name: "bell/ring",
    data: {
      executionId,
      userId: session.user.email,
      prompt: parsed.data.prompt,
      trigger: parsed.data.trigger,
      priority: parsed.data.priority,
      timestamp: new Date().toISOString(),
    },
  });

  const response: { executionId: string; status: "dispatched"; message: string } = {
    executionId,
    status: "dispatched",
    message: "Bell rang. CEO is assembling the team.",
  };

  return NextResponse.json(response);
}
