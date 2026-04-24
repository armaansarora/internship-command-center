import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/auth/require-user";
import { createRejectionReflection } from "@/lib/db/queries/rejection-reflections-rest";

/**
 * POST /api/rejection-reflections
 *
 * R9.6 — Inserts a rejection autopsy row keyed (user_id, application_id).
 * The DB-level UNIQUE on application_id prevents duplicates; callers should
 * gate on `getReflectionForApplication` before attempting an insert if they
 * want to update instead of conflict.
 *
 * Body: { applicationId: uuid, reasons: string[], freeText?: string | null }
 * Returns: { success: boolean, id?: string }
 */

const BodySchema = z.object({
  applicationId: z.string().uuid(),
  reasons: z.array(z.string().min(1).max(120)),
  freeText: z.string().max(500).nullish(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { applicationId, reasons, freeText } = parsed.data;

  const result = await createRejectionReflection({
    userId: auth.user.id,
    applicationId,
    reasons,
    freeText: freeText ?? null,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "create_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, id: result.id },
    { status: 201 },
  );
}
