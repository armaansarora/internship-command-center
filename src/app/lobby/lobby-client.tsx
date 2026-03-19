"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { FLOORS, type FloorId } from "@/types/ui";
import { ProceduralSkyline } from "@/components/world/ProceduralSkyline";
import gsap from "gsap";

/**
 * Lobby client component — The Tower entrance.
 *
 * Immersive experience: you're standing at ground level looking up at the NYC skyline.
 * The building directory is a physical lobby directory board.
 * The sign-in is like entering through glass lobby doors.
 */
export function LobbyClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [entered, setEntered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);

  // Detect returning users
  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasPriorVisit = document.cookie.includes("sb-");
      setIsReturningUser(hasPriorVisit);
    }
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!contentRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      contentRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.5 }
    );

    if (heroRef.current) {
      tl.fromTo(
        heroRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2 },
        "-=1.0"
      );
    }

    if (directoryRef.current) {
      tl.fromTo(
        directoryRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
        "-=0.6"
      );
    }

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
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden">
      {/* ── IMMERSIVE SKYLINE BACKGROUND ── */}
      <ProceduralSkyline floorId="L" />

      {/* ── WINDOW FRAME OVERLAY ── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          boxShadow: "inset 0 0 200px 80px rgba(4, 6, 15, 0.7)",
          zIndex: 1,
        }}
      />

      {/* ── GROUND-LEVEL FOG ── */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "40%",
          background:
            "linear-gradient(to top, rgba(10, 10, 20, 0.95) 0%, rgba(10, 10, 20, 0.6) 30%, rgba(10, 10, 20, 0.2) 60%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* ── GLASS REFLECTIONS (subtle) ── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: `
            linear-gradient(135deg, rgba(201, 168, 76, 0.02) 0%, transparent 50%),
            linear-gradient(225deg, rgba(100, 120, 200, 0.015) 0%, transparent 50%)
          `,
          zIndex: 3,
        }}
      />

      {/* ── WINDOW MULLIONS (vertical glass dividers) ── */}
      <div
        className="pointer-events-none absolute inset-0 flex justify-between px-[12%]"
        aria-hidden="true"
        style={{ zIndex: 4 }}
      >
        <div className="w-px h-full" style={{ background: "linear-gradient(to bottom, rgba(201, 168, 76, 0.05) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.05) 100%)" }} />
        <div className="w-px h-full" style={{ background: "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.08) 50%, rgba(201, 168, 76, 0.03) 100%)" }} />
        <div className="w-px h-full" style={{ background: "linear-gradient(to bottom, rgba(201, 168, 76, 0.05) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.05) 100%)" }} />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        ref={contentRef}
        className="relative flex flex-col items-center justify-center min-h-dvh px-6 w-full max-w-lg mx-auto gap-8 py-12"
        style={{ zIndex: 10, opacity: 0 }}
      >
        {/* Floor indicator — like a real lobby sign */}
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2"
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

        {/* ── HERO SECTION ── */}
        <div ref={heroRef} className="flex flex-col items-center gap-6 text-center">
          {/* Tower Logo Mark */}
          <div className="relative">
            <TowerLogo />
            {/* Glow behind logo */}
            <div
              className="absolute inset-0 -m-4 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(201, 168, 76, 0.15) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
              aria-hidden="true"
            />
          </div>

          <div className="space-y-3">
            <h1
              className="text-3xl md:text-4xl tracking-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "var(--text-primary)",
                textShadow: "0 2px 20px rgba(0,0,0,0.5)",
              }}
            >
              The Tower
            </h1>
            <p
              className="text-sm leading-relaxed max-w-xs mx-auto"
              style={{
                color: "var(--text-secondary)",
                textShadow: "0 1px 10px rgba(0,0,0,0.8)",
              }}
            >
              {isReturningUser
                ? "Welcome back. Your offices are as you left them."
                : "Your internship command center. AI-powered pipeline management, research, and preparation."}
            </p>
          </div>
        </div>

        {/* ── SIGN-IN CARD ── */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 12, 25, 0.75)",
            backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            border: "1px solid rgba(201, 168, 76, 0.2)",
            borderTop: "2px solid rgba(201, 168, 76, 0.5)",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(201, 168, 76, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="p-8 flex flex-col items-center gap-6">
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {isReturningUser ? "Resume your session" : "Enter the building"}
            </p>

            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3.5 text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, #E8C45A 100%)",
                color: "var(--tower-darkest)",
                boxShadow: "0 4px 20px rgba(201, 168, 76, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.boxShadow = "0 6px 30px rgba(201, 168, 76, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)";
                (e.target as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.boxShadow = "0 4px 20px rgba(201, 168, 76, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)";
                (e.target as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {isLoading ? (
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: "0.15em",
                  }}
                >
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
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* ── BUILDING DIRECTORY ── */}
        <div ref={directoryRef} className="w-full space-y-3">
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.25em",
              color: "var(--text-muted)",
              textAlign: "center",
              textShadow: "0 1px 5px rgba(0,0,0,0.5)",
            }}
          >
            BUILDING DIRECTORY
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(10, 12, 25, 0.65)",
              backdropFilter: "blur(20px) saturate(1.3)",
              WebkitBackdropFilter: "blur(20px) saturate(1.3)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <div className="p-3 space-y-0.5">
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

        {/* ── CONSTRUCTION BADGE ── */}
        <div
          className="flex items-center gap-3"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            opacity: 0.5,
          }}
        >
          <div className="h-px w-8" style={{ background: "var(--gold)", opacity: 0.3 }} />
          UNDER CONSTRUCTION — PHASE 0
          <div className="h-px w-8" style={{ background: "var(--gold)", opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );
}

/** Directory row with hover state */
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
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
        available
          ? "hover:bg-white/[0.04] cursor-default"
          : "opacity-35"
      }`}
      style={
        available
          ? {
              borderLeft: "2px solid rgba(201, 168, 76, 0.4)",
            }
          : {
              borderLeft: "2px solid transparent",
            }
      }
    >
      <span
        className="w-7 text-right shrink-0"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          color: available ? "var(--gold)" : "var(--text-muted)",
          textShadow: available ? "0 0 10px rgba(201, 168, 76, 0.3)" : "none",
        }}
      >
        {floorId}
      </span>
      <span
        className="h-4 w-px shrink-0"
        style={{ background: "rgba(255, 255, 255, 0.08)" }}
      />
      <span
        className="text-xs flex-1 truncate"
        style={{
          color: available ? "var(--text-primary)" : "var(--text-muted)",
          fontFamily: "'Satoshi', sans-serif",
        }}
      >
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

/** Tower Logo SVG — geometric Art Deco building mark */
function TowerLogo() {
  return (
    <svg
      width="48"
      height="64"
      viewBox="0 0 48 64"
      fill="none"
      aria-label="The Tower"
      className="relative"
      style={{ filter: "drop-shadow(0 2px 10px rgba(201, 168, 76, 0.3))" }}
    >
      {/* Main tower body */}
      <rect x="14" y="16" width="20" height="48" fill="var(--gold)" opacity="0.12" />
      <rect x="17" y="10" width="14" height="54" fill="var(--gold)" opacity="0.2" />
      <rect x="20" y="4" width="8" height="60" fill="var(--gold)" opacity="0.35" />

      {/* Spire */}
      <rect x="23" y="0" width="2" height="6" fill="var(--gold)" opacity="0.6" />
      <circle cx="24" cy="0" r="1.5" fill="var(--gold)" opacity="0.8" />

      {/* Window grid */}
      {[12, 20, 28, 36, 44, 52].map((y) => (
        <g key={y}>
          <rect x="21" y={y} width="2.5" height="3" fill="var(--gold)" opacity="0.4" rx="0.3" />
          <rect x="24.5" y={y} width="2.5" height="3" fill="var(--gold)" opacity="0.4" rx="0.3" />
        </g>
      ))}

      {/* Lobby entrance glow */}
      <rect x="21" y="56" width="6" height="8" fill="var(--gold)" opacity="0.6" rx="0.5" />

      {/* Side step-backs (Art Deco) */}
      <rect x="10" y="28" width="4" height="36" fill="var(--gold)" opacity="0.08" />
      <rect x="34" y="28" width="4" height="36" fill="var(--gold)" opacity="0.08" />
      <rect x="7" y="38" width="3" height="26" fill="var(--gold)" opacity="0.05" />
      <rect x="38" y="38" width="3" height="26" fill="var(--gold)" opacity="0.05" />

      {/* Edge highlights */}
      <rect x="14" y="16" width="0.5" height="48" fill="var(--gold)" opacity="0.3" />
      <rect x="33.5" y="16" width="0.5" height="48" fill="var(--gold)" opacity="0.15" />
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
