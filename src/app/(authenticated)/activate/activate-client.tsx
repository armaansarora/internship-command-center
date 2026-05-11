"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  recordIntakeAction,
  importFirstApplicationAction,
  dispatchActivationCROAction,
  pollActivationDispatchAction,
  recordActivationStepAction,
  type IntakeLevel,
} from "./actions";

interface ActivateClientProps {
  /**
   * The authenticated user id. Threaded down for greeting + future telemetry
   * hooks; never used for auth (every server action re-verifies the session).
   */
  userId: string;
  userName: string;
  /**
   * Server-resolved starting phase. The page redirects already-complete
   * users away; "source" is for users who finished intake but bailed
   * before importing an application.
   */
  initialPhase?: "intake" | "source";
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
//
// Four phases keep the surface narrow:
//   A — intake          (roles + level + geos)
//   B — source pick     (Gmail OAuth or manual entry)
//   C — working         (poll the CRO dispatch every 1500ms)
//   D — delivered       (show recommendation + door to /penthouse)
//
// The visual choreography PR will wrap these phases with elevator-ascent
// transitions; the data model here stays stable across that change.
// ---------------------------------------------------------------------------

type Phase = "intake" | "source" | "working" | "delivered";

interface IntakeFormState {
  rolesText: string;
  level: IntakeLevel | null;
  geosText: string;
  error: string | null;
}

interface ManualFormState {
  companyName: string;
  role: string;
  applicationUrl: string;
  error: string | null;
}

interface DeliveredState {
  summary: string;
}

interface WorkingState {
  dispatchId: string;
  failureMessage: string | null;
}

const ROLE_LIMIT = 3;
const GEO_LIMIT = 3;
const WORKING_MESSAGES = [
  "Briefing the CRO on your first move.",
  "Pulling pipeline patterns from the war room.",
  "Sharpening the recommendation.",
];
const POLL_INTERVAL_MS = 1_500;

function splitChips(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// Friendly mapping of server-side error codes. Anything not enumerated falls
// back to the raw code so QA can still grep for it during dev.
function friendlyError(code: string): string {
  switch (code) {
    case "no_user":
      return "Session expired. Refresh the page and sign in again.";
    case "roles_required":
      return "Add at least one role you want to chase.";
    case "roles_too_many":
      return `Pick your top ${ROLE_LIMIT} roles for now — you can add more later.`;
    case "role_too_long":
      return "Keep each role to 80 characters or fewer.";
    case "level_invalid":
      return "Choose intern, new grad, or early career.";
    case "geos_required":
      return "Add at least one city or remote preference.";
    case "geos_too_many":
      return `Pick your top ${GEO_LIMIT} geos for now.`;
    case "geo_too_long":
      return "Keep each geo to 80 characters or fewer.";
    case "profile_write_failed":
      return "Could not save your targets. Try once more.";
    case "company_name_invalid":
      return "Add a company name.";
    case "role_invalid":
      return "Add the role you applied to.";
    case "url_too_long":
      return "Application URL is too long. Trim it down.";
    case "application_write_failed":
      return "Could not save the application. Try once more.";
    case "no_gmail_oauth":
      return "Gmail isn't connected yet — let's connect it.";
    case "gmail_sync_failed":
      return "Gmail sync didn't complete. Try manual entry for now.";
    case "gmail_sync_timeout":
      return "Gmail is taking too long. Add one application by hand instead — it's faster.";
    case "no_applications_found":
      // This is THE most common cs-junior bounce: their applications live in
      // Lever / Greenhouse / Workday confirmation emails that our parser
      // can't always identify. We surface a copy that explicitly invites the
      // manual pivot rather than reading like a hard failure.
      return "Couldn't spot a recent application in your inbox — most of yours probably live behind a Lever or Greenhouse link. Add one by hand below; it takes 30 seconds.";
    case "application_read_failed":
    case "profile_read_failed":
      return "Couldn't reach your records. Try once more.";
    case "dispatch_insert_failed":
      return "Couldn't reach the CRO right now. Try again.";
    case "app_id_required":
    case "dispatch_id_required":
    case "dispatch_not_found":
    case "poll_read_failed":
      return "Lost track of the brief. Restart from the source step.";
    default:
      return `Something went wrong (${code}).`;
  }
}

// ---------------------------------------------------------------------------
// Phase components
// ---------------------------------------------------------------------------

function IntakePhase({
  userName,
  state,
  setState,
  onSubmit,
  pending,
}: {
  userName: string;
  state: IntakeFormState;
  setState: (next: IntakeFormState) => void;
  onSubmit: () => void;
  pending: boolean;
}): JSX.Element {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-labelledby="activate-intake-heading"
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A84C]">
          Step 1 of 3
        </p>
        <h1
          id="activate-intake-heading"
          className="font-[Playfair_Display,serif] text-3xl text-white sm:text-4xl"
        >
          {userName ? `Welcome, ${userName}.` : "Welcome to The Tower."}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-white/70">
          Three quick questions. Then your CRO opens the war room and tells you
          exactly where to push next.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="activate-roles"
          className="text-sm font-medium text-white"
        >
          Roles you want
        </label>
        <input
          id="activate-roles"
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. Software Engineer Intern, Product Manager"
          className="w-full rounded-lg border border-white/15 bg-[#1A1A2E]/60 px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
          value={state.rolesText}
          maxLength={300}
          onChange={(e) => setState({ ...state, rolesText: e.target.value })}
        />
        <p className="text-xs text-white/45">
          Separate up to {ROLE_LIMIT} with commas.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-white">
          Where you are
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { value: "intern", label: "Intern" },
              { value: "new_grad", label: "New grad" },
              { value: "early_career", label: "Early career" },
            ] as Array<{ value: IntakeLevel; label: string }>
          ).map((opt) => {
            const selected = state.level === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-4 py-3 text-sm transition ${
                  selected
                    ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white"
                    : "border-white/15 bg-[#1A1A2E]/60 text-white/70 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="level"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setState({ ...state, level: opt.value })}
                  className="sr-only"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="activate-geos"
          className="text-sm font-medium text-white"
        >
          Cities or remote
        </label>
        <input
          id="activate-geos"
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. NYC, SF Bay Area, Remote"
          className="w-full rounded-lg border border-white/15 bg-[#1A1A2E]/60 px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
          value={state.geosText}
          maxLength={300}
          onChange={(e) => setState({ ...state, geosText: e.target.value })}
        />
        <p className="text-xs text-white/45">
          Separate up to {GEO_LIMIT} with commas.
        </p>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-[#C9A84C] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#1A1A2E] transition hover:bg-[#d8b863] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Lock in targets"}
      </button>
    </form>
  );
}

function SourcePhase({
  manual,
  setManual,
  onManualSubmit,
  onGmailConnect,
  pending,
  globalError,
  initialMode = "choice",
}: {
  manual: ManualFormState;
  setManual: (next: ManualFormState) => void;
  onManualSubmit: () => void;
  onGmailConnect: () => void;
  pending: boolean;
  globalError: string | null;
  /** When the Gmail flow surfaced an unrecoverable error, parent passes
   *  "manual" so the phase opens directly into the manual form instead of
   *  forcing the user back to the choice screen they just left. */
  initialMode?: "choice" | "manual";
}): JSX.Element {
  const [mode, setMode] = useState<"choice" | "manual">(initialMode);

  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="activate-source-heading"
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A84C]">
          Step 2 of 3
        </p>
        <h1
          id="activate-source-heading"
          className="font-[Playfair_Display,serif] text-3xl text-white sm:text-4xl"
        >
          One live application.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-white/70">
          The CRO needs something real on the table. Pull it from Gmail or add
          one by hand — both take seconds.
        </p>
      </header>

      {globalError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
        >
          {globalError}
        </p>
      ) : null}

      {mode === "choice" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onGmailConnect}
            disabled={pending}
            className="flex flex-col items-start gap-2 rounded-lg border border-white/15 bg-[#1A1A2E]/60 p-5 text-left transition hover:border-[#C9A84C] disabled:opacity-60"
          >
            <span className="text-xs uppercase tracking-[0.18em] text-[#C9A84C]">
              Fastest
            </span>
            <span className="font-[Playfair_Display,serif] text-xl text-white">
              Connect Gmail
            </span>
            <span className="text-sm text-white/65">
              We&rsquo;ll pull the most recent application emails and pin one
              for the CRO.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            disabled={pending}
            className="flex flex-col items-start gap-2 rounded-lg border border-white/15 bg-[#1A1A2E]/60 p-5 text-left transition hover:border-white/30 disabled:opacity-60"
          >
            <span className="text-xs uppercase tracking-[0.18em] text-white/55">
              Manual
            </span>
            <span className="font-[Playfair_Display,serif] text-xl text-white">
              Add it by hand
            </span>
            <span className="text-sm text-white/65">
              30 seconds. Company, role, link — that&rsquo;s it.
            </span>
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onManualSubmit();
          }}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="manual-company"
              className="text-sm font-medium text-white"
            >
              Company
            </label>
            <input
              id="manual-company"
              type="text"
              autoComplete="organization"
              required
              maxLength={120}
              className="w-full rounded-lg border border-white/15 bg-[#1A1A2E]/60 px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-[#C9A84C] focus:outline-none"
              value={manual.companyName}
              onChange={(e) =>
                setManual({ ...manual, companyName: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="manual-role"
              className="text-sm font-medium text-white"
            >
              Role
            </label>
            <input
              id="manual-role"
              type="text"
              autoComplete="organization-title"
              required
              maxLength={120}
              className="w-full rounded-lg border border-white/15 bg-[#1A1A2E]/60 px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-[#C9A84C] focus:outline-none"
              value={manual.role}
              onChange={(e) => setManual({ ...manual, role: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="manual-url"
              className="text-sm font-medium text-white"
            >
              Application link <span className="text-white/45">(optional)</span>
            </label>
            <input
              id="manual-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              maxLength={2000}
              className="w-full rounded-lg border border-white/15 bg-[#1A1A2E]/60 px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-[#C9A84C] focus:outline-none"
              value={manual.applicationUrl}
              onChange={(e) =>
                setManual({ ...manual, applicationUrl: e.target.value })
              }
            />
          </div>

          {manual.error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
            >
              {manual.error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("choice")}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/30"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#C9A84C] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#1A1A2E] transition hover:bg-[#d8b863] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving…" : "Send to the war room"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function WorkingPhase({
  failureMessage,
  onRetrySource,
}: {
  failureMessage: string | null;
  onRetrySource: () => void;
}): JSX.Element {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setTick((t) => (t + 1) % WORKING_MESSAGES.length),
      2_400,
    );
    return () => window.clearInterval(id);
  }, []);

  const message = WORKING_MESSAGES[tick] ?? WORKING_MESSAGES[0];

  return (
    <section
      className="flex flex-col items-center gap-6 py-12 text-center"
      aria-labelledby="activate-working-heading"
    >
      <p className="text-xs uppercase tracking-[0.22em] text-[#C9A84C]">
        Step 3 of 3
      </p>
      <h1
        id="activate-working-heading"
        className="font-[Playfair_Display,serif] text-3xl text-white sm:text-4xl"
      >
        The CRO is on it.
      </h1>
      <p
        aria-live="polite"
        className="min-h-[1.5rem] text-sm text-white/70"
      >
        {failureMessage ?? message}
      </p>
      {failureMessage ? (
        <button
          type="button"
          onClick={onRetrySource}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30"
        >
          Try again
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-32 overflow-hidden rounded-full bg-white/10"
        >
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#C9A84C]" />
        </span>
      )}
    </section>
  );
}

function DeliveredPhase({
  delivered,
  onEnter,
}: {
  delivered: DeliveredState;
  onEnter: () => void;
}): JSX.Element {
  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="activate-delivered-heading"
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A84C]">
          The brief
        </p>
        <h1
          id="activate-delivered-heading"
          className="font-[Playfair_Display,serif] text-3xl text-white sm:text-4xl"
        >
          Your move.
        </h1>
      </header>
      <article
        aria-live="polite"
        className="rounded-2xl border border-[#C9A84C]/30 bg-[#1A1A2E]/85 p-6 text-base leading-relaxed text-white shadow-[0_18px_60px_-30px_rgba(201,168,76,0.45)] backdrop-blur"
      >
        <p>{delivered.summary}</p>
      </article>
      <button
        type="button"
        onClick={onEnter}
        className="inline-flex items-center justify-center rounded-lg bg-[#C9A84C] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#1A1A2E] transition hover:bg-[#d8b863]"
      >
        Enter the Tower
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export function ActivateClient({
  userId: _userId,
  userName,
  initialPhase = "intake",
}: ActivateClientProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Lazy initial state, in priority order:
  //   1. Gmail OAuth bounce (`?phase=import`) → "source" — the user already
  //      cleared intake; resume at source pick.
  //   2. Server-supplied `initialPhase` — set when page.tsx sees a target
  //      profile but no applications yet (interrupted gauntlet).
  //   3. "intake" default for a brand-new user.
  // We avoid a one-frame intake flash for both 1 and 2 by hydrating the
  // right phase before the first paint.
  const [phase, setPhase] = useState<Phase>(() => {
    if (searchParams?.get("phase") === "import") return "source";
    return initialPhase;
  });

  const [intake, setIntake] = useState<IntakeFormState>({
    rolesText: "",
    level: null,
    geosText: "",
    error: null,
  });
  const [manual, setManual] = useState<ManualFormState>({
    companyName: "",
    role: "",
    applicationUrl: "",
    error: null,
  });
  const [sourceGlobalError, setSourceGlobalError] = useState<string | null>(
    null,
  );
  // When the Gmail path fails in a recoverable way (no apps found, timeout,
  // sync failed) we auto-open the manual form. This saves a click for the
  // most common bounce — Maya bounces here at ~30% in baseline activation
  // testing because her offers live behind Lever / Greenhouse rather than
  // in plain-text Gmail receipts.
  const [sourceInitialMode, setSourceInitialMode] = useState<"choice" | "manual">(
    "choice",
  );
  const [working, setWorking] = useState<WorkingState | null>(null);
  const [delivered, setDelivered] = useState<DeliveredState | null>(null);

  const [pending, startTransition] = useTransition();
  const pollTimerRef = useRef<number | null>(null);
  // Tracks the in-flight dispatch the poll loop is allowed to write back
  // for. If the user clicks "Try again" mid-poll, retrySource() nulls this
  // ref; any awaited poll() that returns afterwards bails before touching
  // state, preventing stale-closure clobber.
  const currentDispatchIdRef = useRef<string | null>(null);

  // Cleanup the poll timer when the component unmounts so a stray callback
  // can't kick off after navigation.
  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      currentDispatchIdRef.current = null;
    };
  }, []);

  // Beat 1 telemetry: the user reached the activate route at all. Fired
  // once per mount via the server-action shim (the client bundle can't
  // ship the service-role-admin path that recordActivationStep imports).
  const lobbyRevealFiredRef = useRef(false);
  useEffect(() => {
    if (lobbyRevealFiredRef.current) return;
    lobbyRevealFiredRef.current = true;
    void recordActivationStepAction({
      beat: "lobby_reveal",
      outcome: "success",
    });
  }, []);

  const advanceToWorking = useCallback(
    async (appId: string) => {
      setPhase("working");
      setWorking({ dispatchId: "", failureMessage: null });

      const dispatchRes = await dispatchActivationCROAction({ appId });
      if (!dispatchRes.ok) {
        setWorking({
          dispatchId: "",
          failureMessage: friendlyError(dispatchRes.error),
        });
        return;
      }
      const dispatchId = dispatchRes.dispatchId;
      currentDispatchIdRef.current = dispatchId;
      setWorking({ dispatchId, failureMessage: null });

      // Closure-scoped guard: every poll() invocation checks the
      // ref before mutating state OR scheduling another tick. If
      // retrySource() (or unmount) clears the ref, the loop dies on
      // the next return without clobbering the new phase.
      const isStillActive = (): boolean =>
        currentDispatchIdRef.current === dispatchId;

      const poll = async (): Promise<void> => {
        const status = await pollActivationDispatchAction({ dispatchId });
        if (!isStillActive()) return;

        if (status.status === "completed") {
          setDelivered({
            summary:
              status.summary && status.summary.length > 0
                ? status.summary
                : "Your CRO is reviewing this in the war room — open the penthouse to continue.",
          });
          setPhase("delivered");
          return;
        }
        if (status.status === "failed") {
          setWorking({
            dispatchId,
            failureMessage: friendlyError(status.error ?? "unknown_error"),
          });
          return;
        }
        pollTimerRef.current = window.setTimeout(() => {
          if (!isStillActive()) return;
          void poll();
        }, POLL_INTERVAL_MS);
      };

      // First poll fires immediately — the dispatch typically completes in
      // 1-3s, so a leading 1.5s setTimeout was dead air for the user.
      void poll();
    },
    [],
  );

  // When the Gmail callback rounds-trips back to /activate?phase=import we
  // skip ahead to the source step (the user already cleared intake before
  // OAuth) and try the Gmail import path once. Failure modes — e.g. the
  // sync didn't surface a recent application — fall through to the manual
  // choice so the user is never trapped.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const phaseParam = searchParams?.get("phase");
    if (phaseParam !== "import") return;
    // Phase already lazy-initialized to "source" above; this effect only
    // owns the async import side effect that the lazy init can't run.
    void (async () => {
      const res = await importFirstApplicationAction({ source: "gmail" });
      if (!res.ok) {
        setSourceGlobalError(friendlyError(res.error));
        // The four recoverable Gmail-path failures land us in manual mode
        // automatically so the user doesn't have to re-click "Add it by
        // hand" after reading the error. `no_gmail_oauth` is excluded —
        // that one means tokens never landed; the user needs the choice
        // screen so they can retry the OAuth flow.
        if (
          res.error === "no_applications_found" ||
          res.error === "gmail_sync_failed" ||
          res.error === "gmail_sync_timeout" ||
          res.error === "application_read_failed"
        ) {
          setSourceInitialMode("manual");
        }
        return;
      }
      await advanceToWorking(res.appId);
    })();
  }, [searchParams, advanceToWorking]);

  const submitIntake = useCallback(() => {
    const roles = splitChips(intake.rolesText).slice(0, ROLE_LIMIT);
    const geos = splitChips(intake.geosText).slice(0, GEO_LIMIT);

    if (roles.length === 0) {
      setIntake({ ...intake, error: friendlyError("roles_required") });
      return;
    }
    if (intake.level === null) {
      setIntake({ ...intake, error: friendlyError("level_invalid") });
      return;
    }
    if (geos.length === 0) {
      setIntake({ ...intake, error: friendlyError("geos_required") });
      return;
    }

    startTransition(() => {
      void (async () => {
        const res = await recordIntakeAction({
          roles,
          level: intake.level as IntakeLevel,
          geos,
        });
        if (!res.ok) {
          setIntake({ ...intake, error: friendlyError(res.error) });
          return;
        }
        setIntake({ ...intake, error: null });
        setPhase("source");
      })();
    });
  }, [intake]);

  const submitManual = useCallback(() => {
    const companyName = manual.companyName.trim();
    const role = manual.role.trim();
    const applicationUrl = manual.applicationUrl.trim();

    if (companyName.length === 0) {
      setManual({ ...manual, error: friendlyError("company_name_invalid") });
      return;
    }
    if (role.length === 0) {
      setManual({ ...manual, error: friendlyError("role_invalid") });
      return;
    }

    startTransition(() => {
      void (async () => {
        const res = await importFirstApplicationAction({
          source: "manual",
          companyName,
          role,
          applicationUrl: applicationUrl.length > 0 ? applicationUrl : undefined,
        });
        if (!res.ok) {
          setManual({ ...manual, error: friendlyError(res.error) });
          return;
        }
        setManual({ ...manual, error: null });
        await advanceToWorking(res.appId);
      })();
    });
  }, [manual, advanceToWorking]);

  const connectGmail = useCallback(() => {
    // The user leaves /activate for the Google consent screen. Existing
    // /api/gmail/auth returns JSON containing `authUrl` + sets the signed
    // state cookie; we then redirect the browser at the consent URL. The
    // signed `next=/activate?phase=import` brings the user straight back
    // here after consent — the phase=import effect above picks up.
    setSourceGlobalError(null);
    const next = encodeURIComponent("/activate?phase=import");
    void (async () => {
      try {
        const res = await fetch(`/api/gmail/auth?next=${next}`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          setSourceGlobalError(friendlyError("no_gmail_oauth"));
          return;
        }
        const body = (await res.json()) as { authUrl?: string };
        if (typeof body.authUrl !== "string") {
          setSourceGlobalError(friendlyError("no_gmail_oauth"));
          return;
        }
        window.location.assign(body.authUrl);
      } catch {
        setSourceGlobalError(friendlyError("no_gmail_oauth"));
      }
    })();
  }, []);

  const enterTower = useCallback(() => {
    void recordActivationStepAction({
      beat: "closing",
      outcome: "success",
    });
    router.push("/penthouse");
  }, [router]);

  const skip = useCallback(() => {
    // Record an "abandon" outcome on whichever beat the user is on. The
    // recorder is fire-and-forget; the navigation is the user-facing
    // promise so we don't await it.
    void recordActivationStepAction({
      beat:
        phase === "intake"
          ? "intake"
          : phase === "source"
            ? "google_connect"
            : phase === "working"
              ? "cro_recommendation"
              : "closing",
      outcome: "abandon",
    });
    router.push("/penthouse");
  }, [router, phase]);

  const retrySource = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    // Drop the current-dispatch claim so any in-flight poll() promise
    // returns and exits without writing back to state.
    currentDispatchIdRef.current = null;
    setWorking(null);
    setPhase("source");
  }, []);

  return (
    <main
      data-phase={phase}
      aria-label="Tower activation"
      className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-16 pt-20 sm:px-8"
    >
      <button
        type="button"
        onClick={skip}
        aria-label="Skip activation"
        className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-white/65 transition hover:border-white/25 hover:text-white sm:right-6 sm:top-6"
      >
        Skip
      </button>

      <div className="flex flex-1 flex-col justify-center">
        {phase === "intake" ? (
          <IntakePhase
            userName={userName}
            state={intake}
            setState={setIntake}
            onSubmit={submitIntake}
            pending={pending}
          />
        ) : null}
        {phase === "source" ? (
          <SourcePhase
            manual={manual}
            setManual={setManual}
            onManualSubmit={submitManual}
            onGmailConnect={connectGmail}
            pending={pending}
            globalError={sourceGlobalError}
            initialMode={sourceInitialMode}
          />
        ) : null}
        {phase === "working" && working ? (
          <WorkingPhase
            failureMessage={working.failureMessage}
            onRetrySource={retrySource}
          />
        ) : null}
        {phase === "delivered" && delivered ? (
          <DeliveredPhase delivered={delivered} onEnter={enterTower} />
        ) : null}
      </div>
    </main>
  );
}
