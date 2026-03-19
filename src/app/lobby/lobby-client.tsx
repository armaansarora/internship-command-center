"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef, type JSX } from "react";
import { FLOORS, type FloorId } from "@/types/ui";
import { ProceduralSkyline } from "@/components/world/ProceduralSkyline";
import gsap from "gsap";

/**
 * Lobby client component — The Tower entrance.
 *
 * Full-screen immersive experience: procedural NYC skyline fills the viewport.
 * Content is arranged in a single viewport with no scrolling needed.
 * The sign-in card floats as a glass panel over the city.
 */
export function LobbyClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasPriorVisit = document.cookie.includes("sb-");
      setIsReturningUser(hasPriorVisit);
    }
  }, []);

  // Cinematic entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll("[data-animate]");
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2 });
    els.forEach((el, i) => {
      tl.fromTo(el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, `-=${0.5 + i * 0.05}`);
    });

    return () => { tl.kill(); };
  }, []);

  async function handleSignIn() {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden">
      {/* ── PROCEDURAL SKYLINE ── */}
      <ProceduralSkyline floorId="L" />

      {/* ── ATMOSPHERIC OVERLAYS ── */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{ boxShadow: "inset 0 0 200px 80px rgba(4, 6, 15, 0.65)" }}
        />
        {/* Heavy bottom fog — creates ground-level density */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "50%",
            background: "linear-gradient(to top, rgba(8, 10, 22, 0.95) 0%, rgba(8, 10, 22, 0.7) 25%, rgba(8, 10, 22, 0.3) 55%, transparent 100%)",
          }}
        />
        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "15%",
            background: "linear-gradient(to bottom, rgba(4, 6, 15, 0.4) 0%, transparent 100%)",
          }}
        />
        {/* Subtle window mullions */}
        <div className="absolute inset-0 flex justify-between px-[12%]">
          {[0.08, 0.05, 0.08].map((opacity, i) => (
            <div
              key={i}
              className="w-px h-full"
              style={{
                background: `linear-gradient(to bottom, rgba(201,168,76,${opacity * 0.6}) 0%, rgba(201,168,76,${opacity}) 50%, rgba(201,168,76,${opacity * 0.6}) 100%)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        ref={containerRef}
        className="relative flex flex-col items-center justify-center flex-1 px-6 w-full max-w-md mx-auto gap-5 py-8"
        style={{ zIndex: 10, opacity: 0 }}
      >
        {/* Floor label */}
        <div
          data-animate
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.3em",
            color: "var(--gold)",
            opacity: 0.5,
          }}
        >
          FLOOR L — THE LOBBY
        </div>

        {/* Logo + Title */}
        <div data-animate className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <TowerLogo />
            <div
              className="absolute inset-0 -m-6"
              style={{
                background: "radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, transparent 70%)",
                filter: "blur(16px)",
              }}
              aria-hidden="true"
            />
          </div>
          <h1
            className="text-2xl md:text-3xl tracking-tight"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--text-primary)",
              textShadow: "0 2px 20px rgba(0,0,0,0.6)",
            }}
          >
            The Tower
          </h1>
          <p
            className="text-xs leading-relaxed max-w-xs"
            style={{
              color: "var(--text-secondary)",
              textShadow: "0 1px 8px rgba(0,0,0,0.8)",
            }}
          >
            {isReturningUser
              ? "Welcome back. Your offices are as you left them."
              : "AI-powered internship pipeline management, research, and preparation."}
          </p>
        </div>

        {/* Sign-in card */}
        <div
          data-animate
          className="w-full rounded-xl"
          style={{
            background: "rgba(6, 8, 18, 0.92)",
            backdropFilter: "blur(30px) saturate(1.5)",
            WebkitBackdropFilter: "blur(30px) saturate(1.5)",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            borderTop: "2px solid rgba(201, 168, 76, 0.65)",
            boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(201, 168, 76, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="p-6 flex flex-col items-center gap-5">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {isReturningUser ? "Resume your session" : "Enter the building"}
            </p>
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, #E8C45A 100%)",
                color: "var(--tower-darkest)",
                boxShadow: "0 4px 24px rgba(201, 168, 76, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              {isLoading ? (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.15em" }}>
                  AUTHENTICATING...
                </span>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}
          </div>
        </div>

        {/* Building Directory — compact version */}
        <div data-animate className="w-full space-y-2">
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.25em",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            BUILDING DIRECTORY
          </div>
          <div
            className="rounded-xl"
            style={{
              background: "rgba(6, 8, 18, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="p-2.5 space-y-px">
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
        </div>

        {/* Footer */}
        <div
          data-animate
          className="flex items-center gap-3"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            opacity: 0.4,
          }}
        >
          <div className="h-px w-6" style={{ background: "var(--gold)", opacity: 0.3 }} />
          UNDER CONSTRUCTION — PHASE 0
          <div className="h-px w-6" style={{ background: "var(--gold)", opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );
}

function DirectoryRow({ floorId, name, label, available }: {
  floorId: FloorId; name: string; label: string; available: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
        available ? "cursor-pointer" : "opacity-30"
      }`}
      style={
        available
          ? {
              borderLeft: hovered ? "2px solid rgba(201, 168, 76, 0.7)" : "2px solid rgba(201, 168, 76, 0.35)",
              background: hovered ? "rgba(201, 168, 76, 0.06)" : "transparent",
              boxShadow: hovered ? "0 0 20px rgba(201, 168, 76, 0.05)" : "none",
            }
          : { borderLeft: "2px solid transparent" }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="w-6 text-right shrink-0"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: available ? "var(--gold)" : "var(--text-muted)",
          textShadow: available ? "0 0 8px rgba(201, 168, 76, 0.25)" : "none",
        }}
      >
        {floorId}
      </span>
      <span className="h-3 w-px shrink-0" style={{ background: "rgba(255, 255, 255, 0.08)" }} />
      <span className="text-xs flex-1 truncate" style={{ color: available ? "var(--text-primary)" : "var(--text-muted)" }}>
        {name}
      </span>
      <span
        className="shrink-0"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.1em",
          color: available ? "var(--text-secondary)" : "var(--text-muted)",
        }}
      >
        {available ? label : "LOCKED"}
      </span>
    </div>
  );
}

function TowerLogo() {
  return (
    <svg
      width="40"
      height="56"
      viewBox="0 0 48 64"
      fill="none"
      aria-label="The Tower"
      className="relative"
      style={{ filter: "drop-shadow(0 2px 10px rgba(201, 168, 76, 0.3))" }}
    >
      <rect x="14" y="16" width="20" height="48" fill="var(--gold)" opacity="0.12" />
      <rect x="17" y="10" width="14" height="54" fill="var(--gold)" opacity="0.2" />
      <rect x="20" y="4" width="8" height="60" fill="var(--gold)" opacity="0.35" />
      <rect x="23" y="0" width="2" height="6" fill="var(--gold)" opacity="0.6" />
      <circle cx="24" cy="0" r="1.5" fill="var(--gold)" opacity="0.8" />
      {[12, 20, 28, 36, 44, 52].map((y) => (
        <g key={y}>
          <rect x="21" y={y} width="2.5" height="3" fill="var(--gold)" opacity="0.4" rx="0.3" />
          <rect x="24.5" y={y} width="2.5" height="3" fill="var(--gold)" opacity="0.4" rx="0.3" />
        </g>
      ))}
      <rect x="21" y="56" width="6" height="8" fill="var(--gold)" opacity="0.6" rx="0.5" />
      <rect x="10" y="28" width="4" height="36" fill="var(--gold)" opacity="0.08" />
      <rect x="34" y="28" width="4" height="36" fill="var(--gold)" opacity="0.08" />
      <rect x="14" y="16" width="0.5" height="48" fill="var(--gold)" opacity="0.3" />
      <rect x="33.5" y="16" width="0.5" height="48" fill="var(--gold)" opacity="0.15" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
