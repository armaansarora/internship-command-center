import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Normalise PostgREST errors to the app's JSON API shape.
 */
export function jsonPostgrestError(
  error: PostgrestError,
  status = 500,
): NextResponse {
  return NextResponse.json(
    { error: { code: "DB_ERROR", message: error.message } },
    { status },
  );
}
