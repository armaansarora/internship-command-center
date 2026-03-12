import { NextRequest } from "next/server";
import { eventBus } from "@/lib/agents/event-bus";
import { AgentStreamParams } from "@/contracts/api";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = AgentStreamParams.safeParse({
    executionId: searchParams.get("executionId"),
  });

  if (!parsed.success) {
    return new Response("Missing executionId", { status: 400 });
  }

  const { executionId } = parsed.data;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const unsub = eventBus.subscribe(executionId, (event) => {
        send(JSON.stringify(event));
      });

      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        unsub();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
