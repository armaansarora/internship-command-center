import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { log } from "@/lib/logger";

// Postgres SQLSTATE codes we map to specific client responses. The raw error
// `message` (which often echoes the offending input — e.g. `invalid input
// syntax for type uuid: "../../admin"`) must NEVER reach the client; the
// SQLSTATE class tells us enough to choose a status without leaking metadata.
const SQLSTATE_INVALID_TEXT_REPRESENTATION = "22P02"; // bad uuid/int/inet/etc.
const SQLSTATE_UNIQUE_VIOLATION = "23505";
const SQLSTATE_CHECK_VIOLATION = "23514";

/**
 * Normalise PostgREST errors to the app's JSON API shape. Maps known
 * client-side error classes (bad UUID, unique conflict, check violation) to
 * 4xx responses without leaking the underlying error text. Everything else
 * is logged server-side and returned as a generic 500.
 */
export function jsonPostgrestError(
  error: PostgrestError,
  status = 500,
): NextResponse {
  if (error.code === SQLSTATE_INVALID_TEXT_REPRESENTATION) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT" } },
      { status: 400 },
    );
  }
  if (error.code === SQLSTATE_UNIQUE_VIOLATION) {
    return NextResponse.json(
      { error: { code: "CONFLICT" } },
      { status: 409 },
    );
  }
  if (error.code === SQLSTATE_CHECK_VIOLATION) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT" } },
      { status: 400 },
    );
  }
  // Unknown class — log internally for diagnosis, return generic to client.
  log.error("postgrest_error", {
    code: error.code,
    hint: error.hint,
    details: error.details,
  });
  return NextResponse.json(
    { error: { code: "DB_ERROR" } },
    { status },
  );
}
