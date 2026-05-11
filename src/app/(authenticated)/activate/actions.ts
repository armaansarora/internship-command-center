"use server";

/**
 * Activation gauntlet server actions.
 *
 * Powers the four phases of `/activate`:
 *
 *   A. recordIntakeAction           — capture roles/level/geos as a TargetProfile.
 *   B. importFirstApplicationAction — write the user's first application (manual or Gmail).
 *   C. dispatchActivationCROAction  — fire a single CRO dispatch and execute it async.
 *   D. pollActivationDispatchAction — read the dispatch row so the client can poll.
 *
 * Every action verifies the session via `getUser()` and returns a structured
 * `{ ok: false, error }` on failure. The CRO executor runs fire-and-forget
 * (no await), mirroring the dispatch lifecycle in ceo-orchestrator: a row is
 * inserted queued, the executor flips it running, completes it with the
 * summary, or fails it with the error string. The client polls dispatch C
 * until it leaves queued/running.
 *
 * Progressive disclosure: this PR only collects roles + level + geos at
 * intake. Companies / musts / nices are deferred to D1+ surfaces (the CRO
 * itself can refine the profile during normal use), so we pass `[]` for
 * those fields into `upsertTargetProfile`.
 */

import { generateText } from "ai";
import { getAgentModel } from "@/lib/ai/model";
import { ACTIVATION_CRO_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budgets";
import { createClient, getUser } from "@/lib/supabase/server";
import { upsertTargetProfile } from "@/lib/agents/cro/target-profile";
import { createApplicationRest } from "@/lib/db/queries/applications-rest";
import {
  insertQueuedDispatch,
  markDispatchRunning,
  completeDispatch,
  failDispatch,
  type AgentDispatchRow,
} from "@/lib/db/queries/agent-dispatches-rest";
import {
  recordActivationStep,
  type ActivationBeat,
  type ActivationOutcome,
  type ActivationSource,
} from "@/lib/analytics/activation-metrics";
import { log } from "@/lib/logger";

// Bound the in-server Gmail sync so it can't blow past Vercel's wall-clock.
// 8 seconds is enough for ~5 messages at p95 (the sync caps message count
// elsewhere); past that we surface a deterministic error so the client can
// pivot to manual.
const GMAIL_SYNC_TIMEOUT_MS = 8_000;
// Bound the CRO generateText so a slow model can't strand a "running"
// dispatch row. The fire-and-forget catch flips the row to failed.
const CRO_GENERATE_TIMEOUT_MS = 20_000;

/**
 * Trim a model summary at the last sentence-ending punctuation before
 * `maxChars`, so a mid-sentence cut never reaches the user. Falls back to
 * a hard slice if no boundary is found (single-sentence outputs).
 */
function trimAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const window = text.slice(0, maxChars);
  const lastBoundary = Math.max(
    window.lastIndexOf("."),
    window.lastIndexOf("!"),
    window.lastIndexOf("?"),
  );
  if (lastBoundary > 0) return window.slice(0, lastBoundary + 1);
  return window;
}

// ---------------------------------------------------------------------------
// Phase A: intake
// ---------------------------------------------------------------------------

export type IntakeLevel = "intern" | "new_grad" | "early_career";

export interface IntakeInput {
  roles: string[];
  level: IntakeLevel;
  geos: string[];
}

export type RecordIntakeResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string };

const ROLE_MAX = 80;
const GEO_MAX = 80;

function validateIntake(input: IntakeInput): string | null {
  if (!Array.isArray(input.roles)) return "roles_required";
  const roles = input.roles.map((r) => r.trim()).filter((r) => r.length > 0);
  if (roles.length === 0) return "roles_required";
  if (roles.length > 3) return "roles_too_many";
  if (roles.some((r) => r.length > ROLE_MAX)) return "role_too_long";

  if (!["intern", "new_grad", "early_career"].includes(input.level)) {
    return "level_invalid";
  }

  if (!Array.isArray(input.geos)) return "geos_required";
  const geos = input.geos.map((g) => g.trim()).filter((g) => g.length > 0);
  if (geos.length === 0) return "geos_required";
  if (geos.length > 3) return "geos_too_many";
  if (geos.some((g) => g.length > GEO_MAX)) return "geo_too_long";

  return null;
}

export async function recordIntakeAction(
  input: IntakeInput,
): Promise<RecordIntakeResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "no_user" };

  const validationError = validateIntake(input);
  if (validationError) return { ok: false, error: validationError };

  const roles = input.roles.map((r) => r.trim()).filter((r) => r.length > 0);
  const geos = input.geos.map((g) => g.trim()).filter((g) => g.length > 0);

  try {
    const stored = await upsertTargetProfile(user.id, {
      version: 1,
      roles,
      level: [input.level],
      companies: [],
      geos,
      musts: [],
      nices: [],
    });
    if (!stored) {
      void recordActivationStep({
        userId: user.id,
        beat: "intake",
        outcome: "error",
      });
      return { ok: false, error: "profile_write_failed" };
    }
    void recordActivationStep({
      userId: user.id,
      beat: "intake",
      outcome: "success",
    });
    return { ok: true, profileId: stored.rowId };
  } catch (err) {
    log.error("activate.intake_failed", undefined, {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    void recordActivationStep({
      userId: user.id,
      beat: "intake",
      outcome: "error",
    });
    return { ok: false, error: "profile_write_failed" };
  }
}

// ---------------------------------------------------------------------------
// Phase B: import first application
// ---------------------------------------------------------------------------

export type ImportFirstApplicationInput =
  | {
      source: "manual";
      companyName: string;
      role: string;
      applicationUrl?: string;
    }
  | { source: "gmail" };

export type ImportFirstApplicationResult =
  | { ok: true; appId: string }
  | { ok: false; error: string };

const COMPANY_MAX = 120;
const APP_ROLE_MAX = 120;
const URL_MAX = 2_000;

export async function importFirstApplicationAction(
  input: ImportFirstApplicationInput,
): Promise<ImportFirstApplicationResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "no_user" };

  const supabase = await createClient();

  if (input.source === "manual") {
    const companyName = input.companyName.trim();
    const role = input.role.trim();
    const applicationUrl = input.applicationUrl?.trim() ?? "";

    if (companyName.length === 0 || companyName.length > COMPANY_MAX) {
      return { ok: false, error: "company_name_invalid" };
    }
    if (role.length === 0 || role.length > APP_ROLE_MAX) {
      return { ok: false, error: "role_invalid" };
    }
    if (applicationUrl.length > URL_MAX) {
      return { ok: false, error: "url_too_long" };
    }

    // Route through the canonical helper so this write inherits the same
    // limit-check, audit hooks, and side effects (match-rescan enqueue) as
    // every other application insert in the codebase.
    try {
      const created = await createApplicationRest({
        userId: user.id,
        companyName,
        role,
        url: applicationUrl.length > 0 ? applicationUrl : undefined,
        status: "applied",
        source: "manual",
      });
      void recordActivationStep({
        userId: user.id,
        beat: "war_room_reveal",
        outcome: "success",
        source: "manual",
      });
      return { ok: true, appId: created.id };
    } catch (err) {
      log.error("activate.import_application_failed", undefined, {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      void recordActivationStep({
        userId: user.id,
        beat: "war_room_reveal",
        outcome: "error",
        source: "manual",
      });
      return { ok: false, error: "application_write_failed" };
    }
  }

  // Gmail path. We do NOT initiate the OAuth flow here — the client routes
  // the user to /api/gmail/auth and returns to /activate?phase=import on
  // success. This action exists so the client can sanity-check that tokens
  // are stored before attempting a sync; when they are not, the client gets
  // a deterministic error code it can branch on.
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("google_tokens")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    log.error("activate.gmail_token_lookup_failed", undefined, {
      userId: user.id,
      error: profileError.message,
    });
    return { ok: false, error: "profile_read_failed" };
  }
  if (!profile?.google_tokens) {
    return { ok: false, error: "no_gmail_oauth" };
  }

  // Tokens exist — kick off the existing Gmail sync path. The sync writes
  // emails AND can auto-create application rows when subject/body parsing
  // identifies a known company. We then surface whatever first application
  // exists; if none was created we fall back to an error so the client can
  // pivot to manual entry. The sync is bounded by an 8s AbortSignal so the
  // user never stares at a spinner past the wall-clock budget.
  try {
    const { syncGmailForUser } = await import("@/lib/gmail/sync");
    await Promise.race([
      syncGmailForUser(user.id, { useAdmin: true }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("gmail_sync_timeout")),
          GMAIL_SYNC_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("activate.gmail_sync_failed", { userId: user.id, error: message });
    void recordActivationStep({
      userId: user.id,
      beat: "google_connect",
      outcome: "error",
      source: "gmail",
    });
    return {
      ok: false,
      error: message === "gmail_sync_timeout" ? "gmail_sync_timeout" : "gmail_sync_failed",
    };
  }

  const { data: firstApp, error: lookupError } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    log.error("activate.gmail_first_app_lookup_failed", undefined, {
      userId: user.id,
      error: lookupError.message,
    });
    void recordActivationStep({
      userId: user.id,
      beat: "google_connect",
      outcome: "error",
      source: "gmail",
    });
    return { ok: false, error: "application_read_failed" };
  }
  if (!firstApp) {
    void recordActivationStep({
      userId: user.id,
      beat: "google_connect",
      outcome: "error",
      source: "gmail",
    });
    return { ok: false, error: "no_applications_found" };
  }

  void recordActivationStep({
    userId: user.id,
    beat: "google_connect",
    outcome: "success",
    source: "gmail",
  });
  return { ok: true, appId: (firstApp as { id: string }).id };
}

// ---------------------------------------------------------------------------
// Phase C: dispatch the activation CRO
// ---------------------------------------------------------------------------

export type DispatchActivationCROResult =
  | { ok: true; dispatchId: string }
  | { ok: false; error: string };

const ACTIVATION_CRO_TASK = "activation_first_action";

/**
 * Build the minimal CRO prompt used by the activation gauntlet.
 *
 * Activation needs ONE crisp sentence the user can act on in their first
 * five minutes — not a full pipeline briefing. The CRO sees the user's
 * brand-new application + their stated targets and recommends the single
 * highest-leverage next action.
 */
function buildActivationCROPrompt(args: {
  userName: string;
  companyName: string | null;
  role: string | null;
  appliedAt: string | null;
  roles: string[];
  level: string[];
  geos: string[];
}): string {
  const targetLine = [
    args.roles.length > 0 ? `roles=${args.roles.join("/")}` : null,
    args.level.length > 0 ? `level=${args.level.join("/")}` : null,
    args.geos.length > 0 ? `geos=${args.geos.join("/")}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  const targetBlock = targetLine.length > 0 ? targetLine : "no targets yet";

  return `You are the CRO of The Tower, an internship command center. ${args.userName} just activated their account and recorded their first application. They have nothing else in their pipeline yet.

FIRST APPLICATION (just added):
  - Company: ${args.companyName ?? "(unknown)"}
  - Role: ${args.role ?? "(unknown)"}
  - Applied: ${args.appliedAt ?? "(just now)"}

USER TARGETS: ${targetBlock}

YOUR JOB: recommend the SINGLE highest-leverage next action this user should take in the next 24 hours to advance this application or build pipeline. ONE sentence. Imperative voice. No preamble, no caveats. Lead with a verb. Example: "Find the recruiter for ${args.companyName ?? "this company"} on LinkedIn today and send a short note referencing your application." Maximum 240 characters.`;
}

interface ActivationContext {
  userId: string;
  userName: string;
  dispatchId: string;
  appId: string;
}

/**
 * Run the activation CRO. Fire-and-forget from `dispatchActivationCROAction`:
 * we transition the dispatch row queued → running, then run a single
 * `generateText` call (no tools, no fan-out — this is a sub-second beat),
 * then completed|failed.
 *
 * Throws are caught and turned into `failDispatch`. Activation must NEVER
 * surface raw model errors to the client.
 */
async function executeActivationCRO(ctx: ActivationContext): Promise<void> {
  await markDispatchRunning(ctx.dispatchId);

  try {
    const supabase = await createClient();

    const [appResult, profileResult] = await Promise.all([
      supabase
        .from("applications")
        .select("company_name, role, applied_at")
        .eq("id", ctx.appId)
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      supabase
        .from("agent_memory")
        .select("content")
        .eq("user_id", ctx.userId)
        .eq("agent", "cro")
        .eq("category", "preference")
        .like("content", "[target_profile_v1]%")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const appRow = (appResult.data as
      | { company_name: string | null; role: string | null; applied_at: string | null }
      | null) ?? null;

    let roles: string[] = [];
    let level: string[] = [];
    let geos: string[] = [];
    const profileContent =
      (profileResult.data as { content: string | null } | null)?.content ?? null;
    if (profileContent) {
      try {
        const { tryParseTargetProfile } = await import(
          "@/lib/agents/cro/target-profile"
        );
        const parsed = tryParseTargetProfile(profileContent);
        if (parsed) {
          roles = parsed.roles;
          level = parsed.level;
          geos = parsed.geos;
        }
      } catch {
        // Parsing failure is non-fatal — the CRO still has the application.
      }
    }

    const prompt = buildActivationCROPrompt({
      userName: ctx.userName,
      companyName: appRow?.company_name ?? null,
      role: appRow?.role ?? null,
      appliedAt: appRow?.applied_at ?? null,
      roles,
      level,
      geos,
    });

    const result = await generateText({
      model: getAgentModel(),
      prompt,
      maxOutputTokens: ACTIVATION_CRO_MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(CRO_GENERATE_TIMEOUT_MS),
    });

    // Trim at sentence boundary so a mid-sentence cut never reaches the
    // user. 600 chars matches the dispatch.summary column budget.
    const summary = trimAtSentence(result.text.trim(), 600);
    const tokensUsed =
      (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);

    if (summary.length === 0) {
      await failDispatch(ctx.dispatchId, "Empty CRO recommendation.");
      void recordActivationStep({
        userId: ctx.userId,
        beat: "cro_recommendation",
        outcome: "error",
      });
      return;
    }

    await completeDispatch(ctx.dispatchId, summary, tokensUsed);
    void recordActivationStep({
      userId: ctx.userId,
      beat: "cro_recommendation",
      outcome: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("activate.cro_executor_failed", err, {
      userId: ctx.userId,
      dispatchId: ctx.dispatchId,
    });
    await failDispatch(ctx.dispatchId, message);
    void recordActivationStep({
      userId: ctx.userId,
      beat: "cro_recommendation",
      outcome: "error",
    });
  }
}

export async function dispatchActivationCROAction(input: {
  appId: string;
}): Promise<DispatchActivationCROResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "no_user" };

  if (typeof input.appId !== "string" || input.appId.length === 0) {
    return { ok: false, error: "app_id_required" };
  }

  const requestId = crypto.randomUUID();
  const dispatchId = await insertQueuedDispatch(
    user.id,
    requestId,
    "cro",
    ACTIVATION_CRO_TASK,
  );

  if (!dispatchId) {
    return { ok: false, error: "dispatch_insert_failed" };
  }

  const userName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Operator";

  const ctx: ActivationContext = {
    userId: user.id,
    userName,
    dispatchId,
    appId: input.appId,
  };

  // Fire-and-forget. Errors are caught inside the executor and recorded on
  // the dispatch row — the client polls and surfaces any failure copy.
  void executeActivationCRO(ctx).catch((err) => {
    log.error("activate.cro_executor_unhandled", err, {
      userId: user.id,
      dispatchId,
    });
  });

  return { ok: true, dispatchId };
}

// ---------------------------------------------------------------------------
// Phase D: poll a dispatch
// ---------------------------------------------------------------------------

export type ActivationDispatchStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface PollActivationDispatchResult {
  status: ActivationDispatchStatus;
  summary?: string;
  error?: string;
}

export async function pollActivationDispatchAction(input: {
  dispatchId: string;
}): Promise<PollActivationDispatchResult> {
  const user = await getUser();
  if (!user) return { status: "failed", error: "no_user" };

  if (typeof input.dispatchId !== "string" || input.dispatchId.length === 0) {
    return { status: "failed", error: "dispatch_id_required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_dispatches")
    .select("status, summary")
    .eq("id", input.dispatchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    log.error("activate.poll_failed", undefined, {
      userId: user.id,
      dispatchId: input.dispatchId,
      error: error.message,
    });
    return { status: "failed", error: "poll_read_failed" };
  }
  if (!data) {
    return { status: "failed", error: "dispatch_not_found" };
  }

  const row = data as Pick<AgentDispatchRow, "status" | "summary">;
  const status = row.status as ActivationDispatchStatus;
  if (status === "completed") {
    return { status, summary: row.summary ?? "" };
  }
  if (status === "failed") {
    return { status, error: row.summary ?? "unknown_error" };
  }
  return { status };
}

// ---------------------------------------------------------------------------
// Client-callable instrumentation
// ---------------------------------------------------------------------------

/**
 * Server-action shim over `recordActivationStep` for client-side beat
 * firings (lobby_reveal, closing, skipped). The wrapper exists because
 * `recordActivationStep` transitively imports the service-role admin
 * client, which can't ship to the browser. Fire-and-forget by contract.
 *
 * The action re-verifies auth via `getUser()` so an anonymous caller can
 * fire `lobby_reveal` with a null user-id (intentional: the landing → sign-in
 * conversion metric needs the pre-auth beat).
 */
export async function recordActivationStepAction(input: {
  beat: ActivationBeat;
  outcome: ActivationOutcome;
  source?: ActivationSource;
  dwellMs?: number;
}): Promise<void> {
  // No throw guarantees: this action wraps a fire-and-forget recorder.
  const user = await getUser();
  await recordActivationStep({
    userId: user?.id ?? null,
    beat: input.beat,
    outcome: input.outcome,
    source: input.source,
    dwellMs: input.dwellMs,
  });
}
