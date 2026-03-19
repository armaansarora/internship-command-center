"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { FLOORS, type FloorId } from "@/types/ui";
import { ProceduralSkyline } from "@/components/world/ProceduralSkyline";
import gsap from "gsap";

/**
 * Lobby client component — The Tower entrance.
 *
 * Full-screen immersive experience: procedural NYC skyline fills the viewport.
 * Luxury Manhattan high-rise aesthetic: commanding typography, premium glass
 * cards, gold atmospheric lighting, and cinematic GSAP entrance animation.
 */
export function LobbyClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasPriorVisit = document.cookie.includes("sb-");
      setIsReturningUser(hasPriorVisit);
    }
  }, []);

  // Mouse tracking for spotlight + content parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };

      // Move spotlight
      if (spotlightRef.current) {
        spotlightRef.current.style.left = `${e.clientX}px`;
        spotlightRef.current.style.top = `${e.clientY}px`;
      }

      // Parallax on content
      if (contentRef.current) {
        const px = (mouseRef.current.x - 0.5) * 6;
        const py = (mouseRef.current.y - 0.5) * 3;
        contentRef.current.style.transform = `translate(${px}px, ${py}px)`;
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Cinematic GSAP entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Stage 1: Fade in container
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1 });

    // Stage 2: Content elements cascade in with stagger
    const els = containerRef.current.querySelectorAll("[data-animate]");
    els.forEach((el, i) => {
      tl.fromTo(
        el,
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.65 },
        `-=${0.55 - i * 0.0}` // stagger: each starts 0.1s after the previous
      );
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      {/* ── PROCEDURAL SKYLINE ── */}
      <ProceduralSkyline floorId="L" />

      {/* ── MOUSE SPOTLIGHT OVERLAY ── */}
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(201, 168, 76, 0.05) 0%, rgba(201, 168, 76, 0.02) 35%, transparent 70%)",
          zIndex: 2,
          willChange: "left, top",
        }}
      />

      {/* ── ATMOSPHERIC OVERLAYS ── */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
        {/* Stronger vignette */}
        <div
          className="absolute inset-0"
          style={{ boxShadow: "inset 0 0 250px 100px rgba(4, 6, 15, 0.75)" }}
        />
        {/* Bottom gradient — darkens lower 40% to ground the content */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "40%",
            background: "linear-gradient(to top, rgba(6, 8, 18, 0.97) 0%, rgba(6, 8, 18, 0.75) 30%, rgba(6, 8, 18, 0.35) 65%, transparent 100%)",
          }}
        />
        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "15%",
            background: "linear-gradient(to bottom, rgba(4, 6, 15, 0.45) 0%, transparent 100%)",
          }}
        />
        {/* Window mullions at 20%, 50%, 80% */}
        {[20, 50, 80].map((pos) => (
          <div
            key={pos}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${pos}%`,
              background: `linear-gradient(to bottom, transparent 8%, rgba(201,168,76,0.04) 40%, rgba(201,168,76,0.04) 60%, transparent 92%)`,
            }}
          />
        ))}
      </div>

      {/* ── MAIN CONTENT with parallax ── */}
      <div
        ref={containerRef}
        className="relative flex flex-col items-center justify-center flex-1 w-full"
        style={{ zIndex: 10, opacity: 0 }}
      >
        <div
          ref={contentRef}
          className="flex flex-col items-center justify-center px-6 w-full max-w-lg mx-auto gap-6 py-8 transition-transform duration-150 ease-out"
        >

          {/* ── FLOOR LABEL ── */}
          <div
            data-animate
            className="flex items-center gap-2"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              letterSpacing: "0.3em",
              color: "var(--gold)",
              opacity: 0.55,
            }}
          >
            <RadarPulse />
            FLOOR L — THE LOBBY
          </div>

          {/* ── HERO: LOGO + TITLE + TAGLINE ── */}
          <div data-animate className="flex flex-col items-center gap-4 text-center">
            {/* Logo with breathing gold glow */}
            <div className="relative flex items-center justify-center">
              <div
                className="absolute"
                style={{
                  width: "140px",
                  height: "140px",
                  background: "radial-gradient(circle, rgba(201, 168, 76, 0.18) 0%, rgba(201, 168, 76, 0.06) 50%, transparent 75%)",
                  filter: "blur(20px)",
                  animation: "logo-breathe 4s ease-in-out infinite",
                }}
                aria-hidden="true"
              />
              <TowerLogo />
              <style>{`
                @keyframes logo-breathe {
                  0%, 100% { opacity: 0.7; transform: scale(1); }
                  50% { opacity: 1; transform: scale(1.15); }
                }
                @media (prefers-reduced-motion: reduce) {
                  @keyframes logo-breathe { 0%, 100% { opacity: 0.85; transform: scale(1); } }
                }
              `}</style>
            </div>

            {/* The Tower — commanding headline */}
            <h1
              className="text-5xl md:text-7xl tracking-tight leading-none"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "var(--text-primary)",
                textShadow: "0 4px 32px rgba(0,0,0,0.8), 0 0 60px rgba(201, 168, 76, 0.12)",
                letterSpacing: "-0.02em",
              }}
            >
              The Tower
            </h1>

            {/* Tagline — fade in, no typewriter */}
            <p
              className="text-sm md:text-base leading-relaxed max-w-sm"
              style={{
                color: "var(--text-secondary)",
                textShadow: "0 1px 10px rgba(0,0,0,0.9)",
                animation: "tagline-fade 1.2s ease-out forwards",
                opacity: 0,
                animationDelay: "0.6s",
              }}
            >
              {isReturningUser
                ? "Welcome back. Your offices are as you left them."
                : "AI-powered internship pipeline management, research, and preparation."}
              <style>{`
                @keyframes tagline-fade {
                  from { opacity: 0; transform: translateY(6px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </p>
          </div>

          {/* ── SIGN-IN CARD ── */}
          <SignInCard
            isLoading={isLoading}
            error={error}
            isReturningUser={isReturningUser}
            onSignIn={handleSignIn}
          />

          {/* ── BUILDING DIRECTORY ── */}
          <div data-animate className="w-full max-w-lg space-y-3">
            {/* Directory header */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(201,168,76,0.2))" }} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.28em",
                  color: "var(--gold)",
                  opacity: 0.7,
                }}
              >
                BUILDING DIRECTORY
              </span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(201,168,76,0.2))" }} />
            </div>

            {/* Directory panel */}
            <div
              className="rounded-xl"
              style={{
                background: "rgba(6, 8, 18, 0.88)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(201,168,76,0.08)",
              }}
            >
              <div className="p-3 space-y-px">
                {FLOORS.filter((f) => f.id !== "L").map((floor, i) => (
                  <DirectoryRow
                    key={floor.id}
                    floorId={floor.id}
                    name={floor.name}
                    label={floor.label}
                    available={floor.phase === 0}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div
            data-animate
            className="flex items-center gap-4"
            style={{ opacity: 0.3 }}
          >
            <div
              className="h-px w-12"
              style={{ background: "var(--gold)" }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.2em",
                color: "var(--gold)",
              }}
            >
              UNDER CONSTRUCTION — PHASE 0
            </span>
            <div
              className="h-px w-12"
              style={{ background: "var(--gold)" }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * SignInCard — premium glass card with 3D tilt (max 3deg), gold top border.
 */
function SignInCard({ isLoading, error, isReturningUser, onSignIn }: {
  isLoading: boolean;
  error: string | null;
  isReturningUser: boolean;
  onSignIn: () => void;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverGlow, setHoverGlow] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setHoverGlow({ x: x * 100, y: y * 100 });
    // Subtle 3D tilt — max 3deg
    el.style.transform = `perspective(700px) rotateY(${(x - 0.5) * 6}deg) rotateX(${-(y - 0.5) * 6}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg)";
  }, []);

  return (
    <div
      ref={ref}
      data-animate
      className="w-full max-w-sm rounded-xl transition-all duration-300"
      style={{
        background: "rgba(6, 8, 18, 0.92)",
        backdropFilter: "blur(32px) saturate(1.6)",
        WebkitBackdropFilter: "blur(32px) saturate(1.6)",
        border: "1px solid rgba(201, 168, 76, 0.2)",
        borderTop: "2px solid rgba(201, 168, 76, 0.7)",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.7), 0 0 60px rgba(201, 168, 76, 0.06), inset 0 1px 0 rgba(255,255,255,0.07)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover glow that follows cursor */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "220px",
          height: "220px",
          left: `${hoverGlow.x}%`,
          top: `${hoverGlow.y}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(201, 168, 76, 0.07) 0%, transparent 70%)",
          transition: "left 0.15s, top 0.15s",
        }}
      />

      <div className="p-7 flex flex-col items-center gap-5 relative">
        {/* Card heading */}
        <div className="flex flex-col items-center gap-1">
          <h2
            className="text-xl tracking-tight"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--text-primary)",
              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            }}
          >
            Enter The Tower
          </h2>
          <p
            className="text-sm"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              color: "var(--text-secondary)",
            }}
          >
            {isReturningUser ? "Resume your session" : "Authenticate to proceed"}
          </p>
        </div>

        {/* Google sign-in button */}
        <button
          onClick={onSignIn}
          disabled={isLoading}
          aria-label={isLoading ? "Authenticating..." : "Continue with Google"}
          className="flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3.5 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C45A 50%, #C9A84C 100%)",
            backgroundSize: "200% auto",
            color: "#0A0A14",
            fontSize: "15px",
            fontFamily: "'Satoshi', sans-serif",
            fontWeight: 600,
            boxShadow: "0 6px 28px rgba(201, 168, 76, 0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 8px 36px rgba(201, 168, 76, 0.55), inset 0 1px 0 rgba(255,255,255,0.25)";
            el.style.transform = "translateY(-2px)";
            el.style.backgroundPosition = "right center";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 6px 28px rgba(201, 168, 76, 0.4), inset 0 1px 0 rgba(255,255,255,0.25)";
            el.style.transform = "translateY(0)";
            el.style.backgroundPosition = "left center";
          }}
        >
          {isLoading ? (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.15em" }}>
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
          <p
            className="text-sm text-center"
            role="alert"
            style={{ color: "var(--error)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * DirectoryRow — interactive floor listing with gold left border and hover glow.
 */
function DirectoryRow({ floorId, name, label, available, index }: {
  floorId: FloorId;
  name: string;
  label: string;
  available: boolean;
  index: number;
}): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Snappier stagger: base delay 600ms + 50ms per item
    const timer = setTimeout(() => setVisible(true), 600 + index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${
        available ? "cursor-pointer" : ""
      }`}
      style={{
        opacity: visible ? (available ? 1 : 0.35) : 0,
        transform: visible
          ? available && hovered
            ? "translateX(5px)"
            : "translateX(0)"
          : "translateX(-12px)",
        transition: "opacity 0.3s ease, transform 0.3s ease, background 0.2s ease, box-shadow 0.2s ease",
        ...(available
          ? {
              borderLeft: hovered
                ? "2px solid rgba(201, 168, 76, 0.75)"
                : "2px solid rgba(201, 168, 76, 0.3)",
              background: hovered ? "rgba(201, 168, 76, 0.06)" : "transparent",
              boxShadow: hovered ? "0 0 24px rgba(201, 168, 76, 0.06)" : "none",
            }
          : { borderLeft: "2px solid transparent" }),
      }}
      onMouseEnter={() => available && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover shimmer */}
      {available && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: hovered ? 1 : 0,
            background: "linear-gradient(90deg, rgba(201, 168, 76, 0.05) 0%, transparent 50%)",
          }}
        />
      )}

      {/* Floor number */}
      <span
        className="w-7 text-right shrink-0 relative tabular-nums"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          fontWeight: 600,
          color: available ? "var(--gold)" : "var(--text-muted)",
          textShadow: available && hovered
            ? "0 0 14px rgba(201, 168, 76, 0.6)"
            : available
            ? "0 0 8px rgba(201, 168, 76, 0.25)"
            : "none",
        }}
      >
        {floorId}
      </span>

      {/* Divider */}
      <span className="h-4 w-px shrink-0" style={{ background: "rgba(255, 255, 255, 0.08)" }} />

      {/* Floor name */}
      <span
        className="flex-1 truncate text-sm"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "14px",
          fontWeight: available ? 500 : 400,
          color: available ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        {name}
      </span>

      {/* Label / Locked */}
      <span
        className="shrink-0"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.12em",
          color: available
            ? hovered
              ? "var(--gold)"
              : "var(--text-secondary)"
            : "var(--text-muted)",
          opacity: available ? 1 : 0.6,
        }}
      >
        {available ? label : "LOCKED"}
      </span>
    </div>
  );
}

/**
 * RadarPulse — animated pulsing rings for the floor label indicator.
 */
function RadarPulse(): JSX.Element {
  return (
    <span className="relative inline-flex items-center justify-center w-3 h-3" aria-hidden="true">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "var(--gold)",
          boxShadow: "0 0 6px rgba(201, 168, 76, 0.7)",
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.45)",
          animation: "radar-ping 3s ease-out infinite",
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.3)",
          animation: "radar-ping 3s ease-out infinite 1.5s",
        }}
      />
      <style>{`
        @keyframes radar-ping {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes radar-ping { 0%, 100% { transform: scale(1); opacity: 0.4; } }
        }
      `}</style>
    </span>
  );
}

/**
 * TowerLogo — larger SVG tower mark, 64x88 viewBox scale.
 */
function TowerLogo(): JSX.Element {
  return (
    <svg
      width="52"
      height="72"
      viewBox="0 0 64 88"
      fill="none"
      aria-label="The Tower logo"
      className="relative"
      style={{ filter: "drop-shadow(0 4px 14px rgba(201, 168, 76, 0.35))" }}
    >
      {/* Base wide block */}
      <rect x="16" y="22" width="32" height="66" fill="var(--gold)" opacity="0.10" />
      {/* Mid shaft */}
      <rect x="22" y="14" width="20" height="74" fill="var(--gold)" opacity="0.18" />
      {/* Core shaft */}
      <rect x="27" y="6" width="10" height="82" fill="var(--gold)" opacity="0.32" />
      {/* Spire */}
      <rect x="30.5" y="0" width="3" height="8" fill="var(--gold)" opacity="0.65" />
      {/* Antenna tip */}
      <circle cx="32" cy="0" r="2" fill="var(--gold)" opacity="0.85" />
      {/* Window pairs — all floors */}
      {[16, 26, 36, 46, 56, 68, 78].map((y) => (
        <g key={y}>
          <rect x="28.5" y={y} width="3" height="4" fill="var(--gold)" opacity="0.42" rx="0.4" />
          <rect x="32.5" y={y} width="3" height="4" fill="var(--gold)" opacity="0.42" rx="0.4" />
        </g>
      ))}
      {/* Lobby base */}
      <rect x="28" y="76" width="8" height="12" fill="var(--gold)" opacity="0.65" rx="0.7" />
      {/* Side wings */}
      <rect x="12" y="38" width="6" height="50" fill="var(--gold)" opacity="0.07" />
      <rect x="46" y="38" width="6" height="50" fill="var(--gold)" opacity="0.07" />
      {/* Edge highlights */}
      <rect x="16" y="22" width="0.75" height="66" fill="var(--gold)" opacity="0.28" />
      <rect x="47.25" y="22" width="0.75" height="66" fill="var(--gold)" opacity="0.14" />
    </svg>
  );
}

/**
 * GoogleIcon — standard Google G logo.
 */
function GoogleIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
