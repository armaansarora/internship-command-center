/**
 * R10.13 — POST /api/offers/[id]/simulate
 *
 * One turn of the negotiation simulator. Client tracks the conversation
 * locally; each turn round-trips the full history + the user's latest
 * reply. Server computes round = floor(history.length / 2), marks
 * done once round >= 4 (simulator caps at 4 rounds per session).
 *
 * Contract:
 *   - 401 when unauthenticated.
 *   - 404 when the offer doesn't exist or isn't owned by the caller.
 *   - 400 on malformed body.
 *   - 200 with { recruiterReply, scoring|null, round, done }.
 *
 * Scoring is always null on round 0 (no user reply to score yet); from
 * round 1 onward it's the `{anchorScore, concessionScore, walkawayScore,
 * critique}` block returned by simulateTurn.
 */
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getOfferById } from "@/lib/db/queries/offers-rest";
import { simulateTurn } from "@/lib/ai/structured/simulator-turn";

export const maxDuration = 60;

const MAX_ROUNDS = 4;

const BodySchema = z.object({
  stance: z.object({
    anchor: z.number().int().nonnegative(),
    flex: z.number().int().nonnegative(),
    walkaway: z.number().int().nonnegative(),
  }),
  history: z.array(
    z.object({
      role: z.enum(["user", "recruiter"]),
      text: z.string(),
    }),
  ),
  userReply: z.string().nullable().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const client = await createClient();
  const offer = await getOfferById(client, auth.user.id, id);
  if (!offer) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { stance, history, userReply } = parsed.data;

  const result = await simulateTurn({
    userFirstName:
      (auth.user as { firstName?: string }).firstName ?? "there",
    offer,
    stance,
    history,
    userReply: userReply ?? null,
  });

  const round = Math.floor(history.length / 2);
  const done = round >= MAX_ROUNDS;

  return NextResponse.json({
    recruiterReply: result.recruiterReply,
    scoring: result.scoring,
    round,
    done,
  });
}
