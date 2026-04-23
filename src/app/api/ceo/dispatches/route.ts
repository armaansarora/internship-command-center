import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDispatchesForRequest } from "@/lib/db/queries/agent-dispatches-rest";

export const dynamic = "force-dynamic";

/**
 * Response shape for GET /api/ceo/dispatches.
 *
 * Deliberately minimal — leaks neither the task prompt nor the summary the
 * subagent returned (those carry live strategy + token-sensitive content and
 * aren't needed to drive the live-graph UI). Only the four fields the graph
 * renderer reads make it to the wire.
 */
export interface DispatchProgressResponse {
  dispatches: Array<{
    agent: string;
    status: "queued" | "running" | "completed" | "failed";
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

const requestIdSchema = z.string().uuid();

/**
 * GET /api/ceo/dispatches?requestId=<uuid>
 *
 * Returns the current dispatch rows for a single bell-ring request — the
 * payload the client-side `useDispatchProgress` hook polls at 300 ms to
 * animate the DispatchGraph.
 *
 * Guardrails:
 *   - 401 if unauthenticated.
 *   - 400 if `requestId` is missing or not a valid UUID.
 *   - 200 with `{ dispatches: [] }` if no rows exist yet — polling starts
 *     the instant the bell is rung, so rows may not have been written yet.
 *     Returning 404 in that window would force the client to swallow a
 *     non-error as an error.
 *   - RLS enforces cross-user isolation at the DB layer
 *     (`getDispatchesForRequest` filters by `user_id`, and the row-level
 *     policy on `agent_dispatches` is `auth.uid() = user_id`).
 *   - `Cache-Control: no-store` — this is a live progress endpoint; Vercel's
 *     default edge cache would defeat the whole purpose.
 */
export async function GET(req: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(req.url);
  const rawRequestId = url.searchParams.get("requestId");

  const parsed = requestIdSchema.safeParse(rawRequestId);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid or missing requestId" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await getDispatchesForRequest(user.id, parsed.data);

  const body: DispatchProgressResponse = {
    dispatches: rows.map((row) => ({
      agent: row.agent,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
