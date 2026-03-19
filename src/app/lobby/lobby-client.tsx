"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { FLOORS, type FloorId } from "@/types/ui";

/**
 * Lobby client component — The building entrance.
 *
 * Construction-mode aesthetic: bare concrete, scaffolding grid, exposed beams.
 * Returning users see a welcome-back greeting.
 * Building directory shows floor status (locked/available).
 */
export function LobbyClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Detect returning users via Supabase session check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If there's a session but the server redirect brought them here,
      // they're a returning user with an expired/invalid session
      if (session === null) {
        // Check for any stored auth indicator — we can't use localStorage
        // in sandboxed iframes, so we rely on the Supabase cookie state
      }
    });
    // Simple heuristic: if there are Supabase cookies present, they've been here before
    if (typeof document !== "undefined") {
      const hasPriorVisit = document.cookie.includes("sb-");
      setIsReturningUser(hasPriorVisit);
    }
  }, []);

  async function handleSignIn() {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      {/* Background — dark concrete */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, var(--tower-darkest) 0%, #0D0D18 40%, var(--tower-darker) 100%)",
        }}
      />

      {/* Construction scaffolding grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(var(--gold) 1px, transparent 1px),
            linear-gradient(90deg, var(--gold) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Concrete texture noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Exposed beam — horizontal accent */}
      <div className="absolute top-[15%] left-0 right-0 h-px bg-[var(--gold)] opacity-10" />
      <div className="absolute top-[85%] left-0 right-0 h-px bg-[var(--gold)] opacity-10" />
      <div className="absolute top-0 bottom-0 left-[10%] w-px bg-[var(--gold)] opacity-[0.05]" />
      <div className="absolute top-0 bottom-0 right-[10%] w-px bg-[var(--gold)] opacity-[0.05]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-6 max-w-md w-full">
        {/* Construction badge */}
        <div className="floor-label tracking-[0.25em] text-[10px] opacity-40">
          FLOOR L — THE LOBBY
        </div>

        {/* Tower mark */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-px w-10 bg-[var(--gold)] opacity-30" />
            <TowerMark />
            <div className="h-px w-10 bg-[var(--gold)] opacity-30" />
          </div>

          <h1 className="text-display text-xl tracking-tight">The Tower</h1>

          <p className="max-w-xs text-center text-sm text-[var(--text-secondary)] leading-relaxed">
            {isReturningUser
              ? "Welcome back. Your offices are as you left them."
              : "Your internship command center. AI-powered pipeline management, research, and preparation."}
          </p>
        </div>

        {/* Sign-in card */}
        <div className="glass-card gold-border-top w-full p-8">
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-[var(--text-secondary)]">
              {isReturningUser ? "Resume your session" : "Enter the building"}
            </p>

            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[var(--gold)] px-6 py-3 text-sm font-medium text-[var(--tower-darkest)] transition-all hover:bg-[var(--gold-bright)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="text-data text-xs tracking-wider">
                  AUTHENTICATING...
                </span>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-[var(--error)]">{error}</p>
            )}
          </div>
        </div>

        {/* Building Directory */}
        <div className="w-full">
          <div className="text-data text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-3 text-center uppercase">
            Building Directory
          </div>
          <div className="glass rounded-lg p-4 space-y-1">
            {FLOORS.filter((f) => f.id !== "L").map((floor) => (
              <DirectoryRow
                key={floor.id}
                floorId={floor.id}
                name={floor.name}
                label={floor.label}
                available={floor.phase === 0}
              />
            ))}
          </div>
        </div>

        {/* Construction notice */}
        <p className="text-data text-[10px] text-[var(--text-muted)] tracking-[0.15em] opacity-60">
          UNDER CONSTRUCTION — PHASE 0
        </p>
      </div>
    </div>
  );
}

/** Single row in the building directory */
function DirectoryRow({
  floorId,
  name,
  label,
  available,
}: {
  floorId: FloorId;
  name: string;
  label: string;
  available: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 px-3 py-2 rounded transition-opacity",
        available ? "opacity-100" : "opacity-30",
      ].join(" ")}
    >
      <span className="text-data text-xs text-[var(--gold)] w-7 text-right shrink-0">
        {floorId}
      </span>
      <span className="h-3 w-px bg-[var(--glass-border)]" />
      <span className="text-xs text-[var(--text-primary)] flex-1 truncate">
        {name}
      </span>
      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
        {available ? label : "LOCKED"}
      </span>
    </div>
  );
}

/** Minimal SVG tower mark — geometric building silhouette */
function TowerMark() {
  return (
    <svg
      width="24"
      height="32"
      viewBox="0 0 24 32"
      fill="none"
      aria-label="The Tower"
    >
      <rect x="4" y="8" width="16" height="24" fill="var(--gold)" opacity="0.15" />
      <rect x="6" y="4" width="12" height="28" fill="var(--gold)" opacity="0.25" />
      <rect x="8" y="0" width="8" height="32" fill="var(--gold)" opacity="0.4" />
      {/* Window dots */}
      <rect x="10" y="6" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="12.5" y="6" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="10" y="10" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="12.5" y="10" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="10" y="14" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="12.5" y="14" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="10" y="18" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      <rect x="12.5" y="18" width="1.5" height="1.5" fill="var(--gold)" opacity="0.6" />
      {/* Door */}
      <rect x="10" y="26" width="4" height="6" fill="var(--gold)" opacity="0.5" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
