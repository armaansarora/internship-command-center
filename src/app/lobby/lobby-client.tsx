"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

/**
 * Lobby client component — handles Google OAuth sign-in.
 * Phase 0: construction-mode aesthetic (bare concrete, scaffolding).
 * Phase 0.7 will flesh out the full immersive lobby environment.
 */
export function LobbyClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* Background — dark tower base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--tower-darkest)] via-[var(--tower-darker)] to-[var(--tower-dark)]" />

      {/* Subtle grid pattern (construction scaffolding hint) */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--gold) 1px, transparent 1px), linear-gradient(90deg, var(--gold) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Floor indicator */}
        <div className="floor-label tracking-[0.2em] text-xs opacity-60">
          FLOOR L — THE LOBBY
        </div>

        {/* Tower mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-px w-16 bg-[var(--gold)] opacity-40" />
          <h1 className="text-display text-xl tracking-tight">
            The Tower
          </h1>
          <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
            Your internship command center. AI-powered pipeline management,
            company research, and interview preparation.
          </p>
          <div className="h-px w-16 bg-[var(--gold)] opacity-40" />
        </div>

        {/* Sign-in card */}
        <div className="glass-card gold-border-top w-full max-w-sm p-8">
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Enter the building
            </p>

            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[var(--gold)] px-6 py-3 text-sm font-medium text-[var(--tower-darkest)] transition-all hover:bg-[var(--gold-bright)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="text-data text-xs animate-gold-pulse">
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

        {/* Construction notice */}
        <p className="text-data text-xs text-[var(--text-muted)]">
          PHASE 0 — UNDER CONSTRUCTION
        </p>
      </div>
    </div>
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
