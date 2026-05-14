"use client";

import type { ChangeEvent, CSSProperties, JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CinematicArrival } from "@/components/lobby/cinematic/CinematicArrival";
import { OtisCharacter } from "@/components/lobby/concierge/OtisCharacter";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";
import { trackPlausibleEvent } from "@/lib/analytics/plausible";
import { claimArrivalPlayAction } from "./actions";

interface ConciergeFlowProps {
  arrivalAlreadyPlayed: boolean;
  floorsUnlocked: string[];
  guestName: string;
  mode?: "first-run" | "update";
}

type Phase = "claiming" | "cinematic" | "concierge" | "finishing" | "redirecting";

type IntakeLevel =
  | "intern"
  | "new_grad"
  | "early_career"
  | "mid_level"
  | "senior"
  | "staff";

type IntakeState = {
  roles: string;
  level: IntakeLevel;
  locations: string;
  timeline: string;
  graduation: string;
  companies: string;
  musts: string;
  preferences: string;
  workAuthorization: "authorized" | "sponsorship" | "unsure";
  resumeStatus: "ready" | "needs_update" | "none";
  searchStage: "starting" | "applying" | "interviewing" | "offer";
  networkingComfort: "comfortable" | "light" | "not_now";
  notes: string;
};

const DRAFT_KEY = "tower-concierge-intake-draft";

const DEFAULT_INTAKE: IntakeState = {
  roles: "",
  level: "intern",
  locations: "",
  timeline: "",
  graduation: "",
  companies: "",
  musts: "",
  preferences: "",
  workAuthorization: "unsure",
  resumeStatus: "needs_update",
  searchStage: "starting",
  networkingComfort: "light",
  notes: "",
};

const LEVEL_LABELS: Record<IntakeLevel, string> = {
  intern: "Internship",
  new_grad: "New grad",
  early_career: "Early career",
  mid_level: "Mid level",
  senior: "Senior",
  staff: "Staff",
};

export function ConciergeFlow({
  arrivalAlreadyPlayed,
  floorsUnlocked,
  guestName,
  mode = "first-run",
}: ConciergeFlowProps): JSX.Element {
  void floorsUnlocked;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(arrivalAlreadyPlayed ? "concierge" : "claiming");
  const [cinematicShouldPlay, setCinematicShouldPlay] = useState(false);
  const [intake, setIntake] = useState<IntakeState>(readDraft);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [googleState, setGoogleState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (phase !== "claiming") return;
    let cancelled = false;
    claimArrivalPlayAction().then((result) => {
      if (cancelled) return;
      if (result.shouldPlayCinematic) {
        setCinematicShouldPlay(true);
        setPhase("cinematic");
      } else {
        setPhase("concierge");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "concierge") return;
    trackPlausibleEvent("tower_onboarding_started", {
      surface: "lobby",
      mode,
      phase,
    });
  }, [mode, phase]);

  const canSubmit =
    intake.roles.trim().length > 0 &&
    intake.locations.trim().length > 0 &&
    phase === "concierge";

  const completion = useMemo(() => {
    const fields = [
      intake.roles,
      intake.locations,
      intake.timeline,
      intake.graduation,
      intake.companies,
      intake.musts,
      intake.preferences,
      intake.notes,
    ];
    const filled = fields.filter((field) => field.trim().length > 0).length + 4;
    return Math.min(100, Math.round((filled / 12) * 100));
  }, [intake]);

  const updateField = useCallback(
    <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => {
      setIntake((current) => ({ ...current, [key]: value }));
      setSaveState("idle");
    },
    [],
  );

  const saveDraft = useCallback(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(intake));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [intake]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setPhase("finishing");
    try {
      const response = await fetch("/api/concierge/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "structured",
          turns: [],
          skip: false,
          profile: buildTargetProfile(intake),
        }),
      });
      if (!response.ok) {
        trackPlausibleEvent("tower_onboarding_submitted", {
          surface: "lobby",
          mode,
          status: "error",
          reason: String(response.status),
        });
        saveDraft();
      } else {
        trackPlausibleEvent("tower_onboarding_submitted", {
          surface: "lobby",
          mode,
          status: "ok",
        });
        window.localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      trackPlausibleEvent("tower_onboarding_submitted", {
        surface: "lobby",
        mode,
        status: "network_error",
      });
      saveDraft();
    }

    await fireBootstrap();
    setPhase("redirecting");
    router.push("/penthouse");
  }, [canSubmit, intake, mode, router, saveDraft]);

  const handleSkip = useCallback(async () => {
    setPhase("finishing");
    try {
      const response = await fetch("/api/concierge/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns: [], skip: true }),
      });
      trackPlausibleEvent("tower_onboarding_skipped", {
        surface: "lobby",
        mode,
        status: response.ok ? "ok" : "error",
        reason: response.ok ? undefined : String(response.status),
      });
    } catch {
      trackPlausibleEvent("tower_onboarding_skipped", {
        surface: "lobby",
        mode,
        status: "network_error",
      });
      // The Penthouse has safe empty states if this network call misses.
    }
    await fireBootstrap();
    setPhase("redirecting");
    router.push("/penthouse");
  }, [mode, router]);

  const handleConnectGoogle = useCallback(async () => {
    setGoogleState("loading");
    trackPlausibleEvent("tower_onboarding_google_connect_started", {
      surface: "lobby",
      mode,
      provider: "google",
    });
    try {
      const response = await fetch("/api/gmail/auth?next=/lobby/onboarding", {
        method: "GET",
      });
      const body = (await response.json().catch(() => ({}))) as { authUrl?: string };
      if (!response.ok || !body.authUrl) {
        trackPlausibleEvent("tower_onboarding_google_connect_failed", {
          surface: "lobby",
          mode,
          provider: "google",
          status: !response.ok ? "error" : "missing_url",
          reason: !response.ok ? String(response.status) : undefined,
        });
        setGoogleState("error");
        return;
      }
      saveDraft();
      window.location.href = body.authUrl;
    } catch {
      trackPlausibleEvent("tower_onboarding_google_connect_failed", {
        surface: "lobby",
        mode,
        provider: "google",
        status: "network_error",
      });
      setGoogleState("error");
    }
  }, [mode, saveDraft]);

  return (
    <div
      aria-label="Lobby onboarding"
      data-phase={phase}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "grid",
        gridTemplateColumns: "1fr",
        background:
          "linear-gradient(115deg, rgba(17, 8, 9, 0.92), rgba(10, 12, 24, 0.9) 52%, rgba(33, 21, 10, 0.82))",
      }}
    >
      {phase === "cinematic" && (
        <CinematicArrival
          arrivalAlreadyPlayed={!cinematicShouldPlay}
          onComplete={() => setPhase("concierge")}
          onSkip={() => setPhase("concierge")}
        />
      )}

      {(phase === "concierge" || phase === "finishing" || phase === "redirecting") && (
        <main
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1080px)",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            padding: "clamp(14px, 2vw, 24px)",
            overflow: "hidden",
            minHeight: "100dvh",
          }}
        >
          {phase === "concierge" ? (
            <StructuredIntakeDesk
              guestName={guestName}
              mode={mode}
              intake={intake}
              completion={completion}
              canSubmit={canSubmit}
              saveState={saveState}
              googleState={googleState}
              onFieldChange={updateField}
              onSave={saveDraft}
              onSkip={handleSkip}
              onSubmit={handleSubmit}
              onConnectGoogle={handleConnectGoogle}
            />
          ) : (
            <ElevatorProgress mode={mode} />
          )}
        </main>
      )}

      <style>{`
        @media (max-width: 980px) {
          div[aria-label="Lobby onboarding"] {
            grid-template-columns: 1fr !important;
          }
          div[aria-label="Lobby onboarding"] main {
            grid-template-columns: 1fr !important;
            align-content: start;
            overflow-y: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

interface StructuredIntakeDeskProps {
  guestName: string;
  mode: "first-run" | "update";
  intake: IntakeState;
  completion: number;
  canSubmit: boolean;
  saveState: "idle" | "saved" | "error";
  googleState: "idle" | "loading" | "error";
  onFieldChange: <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => void;
  onSave: () => void;
  onSkip: () => void;
  onSubmit: () => void;
  onConnectGoogle: () => void;
}

function StructuredIntakeDesk({
  guestName,
  mode,
  intake,
  completion,
  canSubmit,
  saveState,
  googleState,
  onFieldChange,
  onSave,
  onSkip,
  onSubmit,
  onConnectGoogle,
}: StructuredIntakeDeskProps): JSX.Element {
  return (
    <section
      aria-label="Otis structured intake desk"
      style={{
        border: "1px solid rgba(201, 168, 76, 0.22)",
        background: "rgba(8, 10, 20, 0.88)",
        borderRadius: "8px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.42)",
        overflow: "hidden",
        maxHeight: "calc(100dvh - 32px)",
        display: "grid",
        gridTemplateRows: "auto auto minmax(0, 1fr) auto auto",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "14px",
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            Otis intake
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(24px, 2.4vw, 31px)",
              lineHeight: 1.05,
              color: "#F5EEE1",
            }}
          >
            {mode === "update" ? "Update your search record" : "Set your search record"}
          </h1>
          <p
            style={{
              margin: "7px 0 0",
              color: "rgba(245, 238, 225, 0.68)",
              fontSize: "13px",
              lineHeight: 1.45,
              maxWidth: "64ch",
            }}
          >
            {guestName ? `${guestName}, this` : "This"} gives the floors the targets,
            constraints, and connections they need to work cleanly.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <OtisCharacter
            mood="listening"
            avatarStyle={{ width: "58px", height: "92px", maxWidth: "58px" }}
            showNameplate={false}
          />
          <div
            aria-label={`Intake ${completion}% complete`}
            style={{
              width: "76px",
              textAlign: "right",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "rgba(245, 238, 225, 0.72)",
            }}
          >
            {completion}%
            <div
              aria-hidden="true"
              style={{
                height: "3px",
                marginTop: "8px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${completion}%`,
                  height: "100%",
                  background: "var(--gold)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-label="What this powers"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "8px",
          padding: "10px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(201,168,76,0.045)",
        }}
      >
        {[
          ["War Room", "Role matching"],
          ["CRO brief", "Priorities"],
          ["Situation Room", "Replies"],
          ["Calendar", "Conflicts"],
        ].map(([label, detail]) => (
          <div
            key={label}
            style={{
              border: "1px solid rgba(201,168,76,0.14)",
              borderRadius: "7px",
              padding: "8px 9px",
              minHeight: "46px",
              background: "rgba(7,9,18,0.42)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#E8C45A",
              }}
            >
              {label}
            </p>
            <p style={{ margin: "3px 0 0", color: "rgba(245,238,225,0.62)", fontSize: "12px" }}>
              {detail}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
          padding: "14px 20px 8px",
          overflow: "auto",
          minHeight: 0,
        }}
      >
        <TextField
          label="Target roles"
          value={intake.roles}
          placeholder="Investment Banking Summer Analyst, SWE intern"
          required
          onChange={(value) => onFieldChange("roles", value)}
        />
        <SelectField
          label="Level"
          value={intake.level}
          options={LEVEL_LABELS}
          onChange={(value) => onFieldChange("level", value)}
        />
        <TextField
          label="Target locations"
          value={intake.locations}
          placeholder="New York, Chicago, Remote"
          required
          onChange={(value) => onFieldChange("locations", value)}
        />
        <TextField
          label="Timeline"
          value={intake.timeline}
          placeholder="Summer 2027, January start, immediately"
          onChange={(value) => onFieldChange("timeline", value)}
        />
        <TextField
          label="Graduation"
          value={intake.graduation}
          placeholder="May 2027, junior, senior"
          onChange={(value) => onFieldChange("graduation", value)}
        />
        <TextField
          label="Target companies"
          value={intake.companies}
          placeholder="Goldman Sachs, Vercel, Stripe"
          onChange={(value) => onFieldChange("companies", value)}
        />
        <SelectField
          label="Work authorization"
          value={intake.workAuthorization}
          options={{
            authorized: "Authorized",
            sponsorship: "Needs sponsorship",
            unsure: "Not sure",
          }}
          onChange={(value) => onFieldChange("workAuthorization", value)}
        />
        <SelectField
          label="Resume status"
          value={intake.resumeStatus}
          options={{
            ready: "Ready",
            needs_update: "Needs update",
            none: "No resume yet",
          }}
          onChange={(value) => onFieldChange("resumeStatus", value)}
        />
        <SelectField
          label="Search stage"
          value={intake.searchStage}
          options={{
            starting: "Just starting",
            applying: "Actively applying",
            interviewing: "Interviewing",
            offer: "Offer stage",
          }}
          onChange={(value) => onFieldChange("searchStage", value)}
        />
        <SelectField
          label="Networking comfort"
          value={intake.networkingComfort}
          options={{
            comfortable: "Comfortable with warm intros",
            light: "Light nudges only",
            not_now: "Not now",
          }}
          onChange={(value) => onFieldChange("networkingComfort", value)}
        />
        <div style={{ gridColumn: "span 2" }}>
          <TextAreaField
            label="Constraints"
            value={intake.musts}
            placeholder="Visa, commute, industry exclusions, school schedule"
            onChange={(value) => onFieldChange("musts", value)}
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <TextAreaField
            label="Preferences"
            value={intake.preferences}
            placeholder="Hybrid, company size, team style, compensation"
            onChange={(value) => onFieldChange("preferences", value)}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <TextAreaField
            label="Anything Otis should remember"
            value={intake.notes}
            placeholder="Extra context that should shape recommendations"
            onChange={(value) => onFieldChange("notes", value)}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "16px",
          alignItems: "center",
          margin: "8px 20px 12px",
          padding: "12px",
          border: "1px solid rgba(76, 143, 212, 0.22)",
          background: "rgba(76, 143, 212, 0.08)",
          borderRadius: "8px",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#F5EEE1", fontSize: "14px", fontWeight: 600 }}>
            Gmail &amp; Calendar
          </p>
          <p style={{ margin: "4px 0 0", color: "rgba(245,238,225,0.65)", fontSize: "12px" }}>
            Optional now, always available in Settings. Used for replies, interview invites,
            follow-ups, and calendar conflicts.
          </p>
          {googleState === "error" && (
            <p role="alert" style={{ margin: "6px 0 0", color: "#F87171", fontSize: "12px" }}>
              The connection desk did not answer. Save progress and try again.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onConnectGoogle}
          disabled={googleState === "loading"}
          style={secondaryButtonStyle(googleState === "loading")}
          aria-label="Connect Gmail and Google Calendar"
        >
          {googleState === "loading" ? "Opening" : "Connect"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "12px",
          padding: "12px 20px 16px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onSave} style={secondaryButtonStyle(false)}>
            Save progress
          </button>
          <button type="button" onClick={onSkip} style={ghostButtonStyle}>
            Skip for now
          </button>
          <span
            role={saveState === "error" ? "alert" : "status"}
            style={{
              alignSelf: "center",
              minWidth: "110px",
              fontSize: "12px",
              color: saveState === "error" ? "#F87171" : "rgba(245,238,225,0.54)",
            }}
          >
            {saveState === "saved" ? "Progress saved." : saveState === "error" ? "Could not save." : ""}
          </span>
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          style={primaryButtonStyle(!canSubmit)}
          aria-label="Send me up to the Penthouse"
        >
          Send me up
        </button>
      </div>

      <style>{`
        @media (max-height: 820px) {
          section[aria-label="Otis structured intake desk"] {
            max-height: calc(100dvh - 20px) !important;
          }
        }
        @media (max-width: 760px) {
          section[aria-label="Otis structured intake desk"] {
            max-height: none !important;
          }
          section[aria-label="Otis structured intake desk"] > div[aria-label="What this powers"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          section[aria-label="Otis structured intake desk"] > div:nth-child(3) {
            grid-template-columns: 1fr !important;
            overflow: visible !important;
          }
          section[aria-label="Otis structured intake desk"] > div:nth-child(3) > div {
            grid-column: auto !important;
          }
        }
      `}</style>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>
        {label}
        {required ? <span style={{ color: "var(--gold)" }}> *</span> : null}
      </span>
      <input
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{ ...inputStyle, resize: "vertical", minHeight: "58px" }}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T)}
        style={inputStyle}
      >
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label as string}
          </option>
        ))}
      </select>
    </label>
  );
}

function ElevatorProgress({ mode }: { mode: "first-run" | "update" }): JSX.Element {
  const title = mode === "update" ? "Updating the building record" : "Calling the Penthouse elevator";
  const steps = [
    "Filing intake with Otis",
    "Starting first discovery pass",
    "Preparing the Penthouse briefing",
  ];
  return (
    <section
      aria-label="Onboarding transition progress"
      style={{
        border: "1px solid rgba(201, 168, 76, 0.24)",
        background: "rgba(8, 10, 20, 0.9)",
        borderRadius: "8px",
        padding: "34px",
        color: "#F5EEE1",
        boxShadow: "0 30px 80px rgba(0,0,0,0.42)",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--gold)",
        }}
      >
        Elevator dispatch
      </p>
      <h2
        style={{
          margin: 0,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "32px",
          lineHeight: 1.05,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "grid", gap: "12px", marginTop: "24px" }}>
        {steps.map((step, index) => (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: index === 2 ? "rgba(245,238,225,0.72)" : "#F5EEE1",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: index === 2 ? "rgba(201,168,76,0.28)" : "var(--gold)",
                boxShadow: index === 2 ? "none" : "0 0 14px rgba(201,168,76,0.5)",
              }}
            />
            {step}
          </div>
        ))}
      </div>
      <p style={{ margin: "22px 0 0", color: "rgba(245,238,225,0.58)", fontSize: "13px" }}>
        You will see the dashboard as soon as the elevator doors open.
      </p>
    </section>
  );
}

function readDraft(): IntakeState {
  if (typeof window === "undefined") return DEFAULT_INTAKE;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULT_INTAKE;
    const parsed = JSON.parse(raw) as Partial<IntakeState>;
    return { ...DEFAULT_INTAKE, ...parsed };
  } catch {
    return DEFAULT_INTAKE;
  }
}

function buildTargetProfile(intake: IntakeState): TargetProfile {
  const roles = splitList(intake.roles).slice(0, 8);
  const geos = splitList(intake.locations).slice(0, 8);
  const companies = splitList(intake.companies).slice(0, 25);
  const musts = [
    ...splitList(intake.musts),
    authPhrase(intake.workAuthorization),
  ].filter((item) => item.length > 0).slice(0, 10);
  const nices = [
    ...splitList(intake.preferences),
    resumePhrase(intake.resumeStatus),
    networkingPhrase(intake.networkingComfort),
  ].filter((item) => item.length > 0).slice(0, 10);

  const notes = [
    `Timeline: ${intake.timeline || "not specified"}`,
    `Graduation: ${intake.graduation || "not specified"}`,
    `Search stage: ${intake.searchStage.replace(/_/g, " ")}`,
    intake.notes.trim(),
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 800);

  return {
    version: 1,
    roles: roles.length > 0 ? roles : ["Software Engineer"],
    level: [intake.level],
    companies,
    geos: geos.length > 0 ? geos : ["Remote"],
    musts,
    nices,
    notes,
  };
}

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function authPhrase(value: IntakeState["workAuthorization"]): string {
  if (value === "authorized") return "Authorized to work without sponsorship";
  if (value === "sponsorship") return "Needs sponsorship-friendly employers";
  return "";
}

function resumePhrase(value: IntakeState["resumeStatus"]): string {
  if (value === "ready") return "Resume is ready";
  if (value === "needs_update") return "Resume needs update";
  return "Needs first resume";
}

function networkingPhrase(value: IntakeState["networkingComfort"]): string {
  if (value === "comfortable") return "Comfortable with warm introductions";
  if (value === "light") return "Light networking nudges only";
  return "Networking paused for now";
}

async function fireBootstrap(): Promise<void> {
  trackPlausibleEvent("tower_onboarding_bootstrap_requested", {
    surface: "lobby",
    action: "bootstrap",
  });
  try {
    const response = await fetch("/api/onboarding/bootstrap-discovery", { method: "POST" });
    if (!response.ok) {
      trackPlausibleEvent("tower_onboarding_bootstrap_failed", {
        surface: "lobby",
        action: "bootstrap",
        status: "error",
        reason: String(response.status),
      });
    }
  } catch {
    trackPlausibleEvent("tower_onboarding_bootstrap_failed", {
      surface: "lobby",
      action: "bootstrap",
      status: "network_error",
    });
    // Scheduled discovery can recover later.
  }
}

const fieldWrapStyle = {
  display: "grid",
  gap: "5px",
} satisfies CSSProperties;

const fieldLabelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(245,238,225,0.62)",
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "6px",
  background: "rgba(255,255,255,0.045)",
  color: "#F5EEE1",
  minHeight: "44px",
  padding: "8px 10px",
  fontFamily: "'Satoshi', system-ui, sans-serif",
  fontSize: "13px",
  lineHeight: 1.4,
} satisfies CSSProperties;

const ghostButtonStyle = {
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "6px",
  background: "transparent",
  color: "rgba(245,238,225,0.7)",
  display: "inline-flex",
  justifyContent: "center",
  minHeight: "44px",
  padding: "9px 12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} satisfies CSSProperties;

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    alignItems: "center",
    border: "1px solid rgba(201,168,76,0.65)",
    borderRadius: "6px",
    background: disabled
      ? "rgba(255,255,255,0.06)"
      : "linear-gradient(135deg, #C9A84C, #E8C45A)",
    color: disabled ? "rgba(245,238,225,0.45)" : "#0A0A14",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: "44px",
    padding: "10px 16px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 12px 28px rgba(201,168,76,0.22)",
  };
}

function secondaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    alignItems: "center",
    border: "1px solid rgba(201,168,76,0.24)",
    borderRadius: "6px",
    background: "rgba(201,168,76,0.08)",
    color: "#E8C45A",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: "44px",
    padding: "9px 12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}
