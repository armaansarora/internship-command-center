"use client";

import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { FLOORS, type FloorId } from "@/types/ui";
import { LobbyBackground } from "@/components/world/LobbyBackground";
import { Elevator } from "@/components/world/Elevator";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { gsap } from "@/lib/gsap-init";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    nonce?: string;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load"));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

async function generateGoogleNonce(): Promise<{ raw: string; hashed: string } | null> {
  if (!window.crypto?.getRandomValues || !window.crypto.subtle) return null;

  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  const raw = btoa(String.fromCharCode(...bytes));
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashed = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { raw, hashed };
}

function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "beta_not_invited":
      return "This email does not have a Tower access key yet. Join the waitlist or use an invited account.";
    case "auth_failed":
      return "The front desk could not verify that sign-in. Try again.";
    default:
      return "Sign-in failed. Try again.";
  }
}

/**
 * Lobby client component — The Tower entrance.
 *
 * Full-screen immersive experience: luxury office reception hall (BUG-010).
 * Dark marble, golden chandelier lighting, architectural pillars.
 * Commanding typography, premium glass cards, cinematic GSAP entrance.
 *
 * GSAP is enhancement-only. A CSS animation provides the initial fade-in fallback
 * so content is always visible even if GSAP is slow to initialize.
 */
export function LobbyClient({
  isAuthenticated = false,
  initialError = null,
  googleClientId = null,
}: {
  isAuthenticated?: boolean;
  initialError?: string | null;
  googleClientId?: string | null;
}) {
  const [error, setError] = useState<string | null>(initialError);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleNonceRef = useRef<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Detect returning user from cookie (no SSR mismatch — empty initial render).
  // The single synchronous setState here is intentional: this is the one-time
  // hydration handoff from server-rendered "unknown" to the actual cookie value.
  // The cascading-render cost is a single extra render, paid once on mount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const hasPriorVisit = document.cookie.includes("sb-");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR hydration handoff
    setIsReturningUser(hasPriorVisit);
  }, []);

  // Mouse tracking for spotlight — rAF-throttled with translate3d for GPU layer (M1).
  // Disabled under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let scheduled = false;

    const flush = () => {
      scheduled = false;
      const el = spotlightRef.current;
      if (el) {
        el.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0) translate(-50%, -50%)`;
      }
    };

    const onMove = (e: MouseEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (!scheduled) {
        scheduled = true;
        rafId = requestAnimationFrame(flush);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  // Cinematic GSAP entrance animation — enhancement only. Skipped entirely
  // when the user has requested reduced motion; the CSS fallback keeps the
  // content visible without animation.
  useEffect(() => {
    if (!containerRef.current) return;
    if (prefersReducedMotion) {
      containerRef.current.style.animation = "none";
      containerRef.current.style.opacity = "1";
      const els = containerRef.current.querySelectorAll("[data-animate]");
      els.forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "none";
      });
      return;
    }

    containerRef.current.style.animation = "none";
    containerRef.current.style.opacity = "0";

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1 });

    const els = containerRef.current.querySelectorAll("[data-animate]");
    els.forEach((el, i) => {
      tl.fromTo(
        el,
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.65 },
        `-=${0.55 - i * 0.0}`
      );
    });

    return () => {
      tl.kill();
    };
  }, [prefersReducedMotion]);

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setError("Google did not return a sign-in credential. Try again.");
      return;
    }

    setError(null);
    setIsAuthenticating(true);
    try {
      const result = await fetch("/api/auth/google-id-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: response.credential,
          next: new URLSearchParams(window.location.search).get("next"),
          nonce: googleNonceRef.current,
        }),
      });

      const payload = (await result.json().catch(() => ({}))) as {
        error?: string;
        next?: string;
      };

      if (!result.ok) {
        setError(authErrorMessage(payload.error));
        setIsAuthenticating(false);
        return;
      }

      window.location.assign(payload.next ?? "/penthouse");
    } catch {
      setError("The front desk could not verify that sign-in. Try again.");
      setIsAuthenticating(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    if (!googleClientId) return;

    let cancelled = false;
    loadGoogleIdentityScript()
      .then(async () => {
        const nonce = await generateGoogleNonce();
        if (cancelled) return;
        const google = window.google?.accounts?.id;
        const buttonEl = googleButtonRef.current;
        if (!google || !buttonEl) {
          setError("Google sign-in is not available. Try again.");
          return;
        }

        googleNonceRef.current = nonce?.raw ?? null;
        google.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
          ux_mode: "popup",
          ...(nonce ? { nonce: nonce.hashed } : {}),
        });
        buttonEl.replaceChildren();
        google.renderButton(buttonEl, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(328, buttonEl.clientWidth || 328),
        });
      })
      .catch(() => {
        if (!cancelled) setError("Google sign-in failed to load. Try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, handleGoogleCredential, isAuthenticated]);

  const visibleError =
    error ??
    (!isAuthenticated && !googleClientId ? "Google sign-in is not configured." : null);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">

      {/* ── ELEVATOR (authenticated users only) ── */}
      {isAuthenticated && <Elevator />}

      {/* ── PRIVATE BETA ACCESS TICKER ── */}
      <ConstructionTicker />

      {/* ── LOBBY BACKGROUND — BUG-010: luxury reception, not skyline ── */}
      <LobbyBackground />

      {/* ── MOUSE SPOTLIGHT OVERLAY ──
          Position is applied via transform: translate3d(x, y, 0) translate(-50%, -50%)
          inside a rAF callback (M1) for GPU-promoted, layout-free updates. */}
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed"
        style={{
          left: 0,
          top: 0,
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(201, 168, 76, 0.06) 0%, rgba(201, 168, 76, 0.025) 35%, transparent 70%)",
          zIndex: 2,
          willChange: "transform",
        }}
      />

      {/* ── ATMOSPHERIC OVERLAYS ── */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
        {/* Softer vignette — more like looking through a window pane */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: "inset 0 0 180px 60px rgba(4, 6, 15, 0.55)",
          }}
        />
        {/* Bottom gradient — softened, more atmospheric */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "45%",
            background: "linear-gradient(to top, rgba(6, 8, 18, 0.88) 0%, rgba(6, 8, 18, 0.55) 35%, rgba(6, 8, 18, 0.2) 65%, transparent 100%)",
          }}
        />
        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "12%",
            background: "linear-gradient(to bottom, rgba(4, 6, 15, 0.35) 0%, transparent 100%)",
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

        {/* Scanline overlay — very subtle horizontal lines across the whole page */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(255,255,255,0.012) 1px, rgba(255,255,255,0.012) 2px)",
            backgroundSize: "100% 2px",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      </div>

      {/* ── FLOATING DUST PARTICLES ── */}
      <ParticleField />

      {/* ── MAIN CONTENT with parallax ──
          opacity starts at 1 with CSS animation fallback;
          GSAP takes over immediately and provides the dramatic entrance */}
      <div
        ref={containerRef}
        className="relative flex flex-col items-center justify-center flex-1 w-full"
        style={{
          zIndex: 10,
          opacity: 1,
          animation: "lobby-entrance 0.8s ease-out forwards",
        }}
      >
        <div
          className="flex flex-col items-center justify-center px-6 w-full max-w-lg mx-auto gap-6 py-8"
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
            {/* Logo with dramatic aura glow */}
            <div className="relative flex items-center justify-center">
              {/* Outer soft aura */}
              <div
                className="absolute"
                style={{
                  width: "220px",
                  height: "220px",
                  background: "radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, rgba(201, 168, 76, 0.04) 45%, transparent 72%)",
                  filter: "blur(28px)",
                  animation: "logo-breathe 5s ease-in-out infinite",
                }}
                aria-hidden="true"
              />
              {/* Inner tight glow */}
              <div
                className="absolute"
                style={{
                  width: "120px",
                  height: "120px",
                  background: "radial-gradient(circle, rgba(201, 168, 76, 0.22) 0%, rgba(201, 168, 76, 0.08) 50%, transparent 75%)",
                  filter: "blur(12px)",
                  animation: "logo-breathe 5s ease-in-out infinite 0.5s",
                }}
                aria-hidden="true"
              />
              <TowerLogo />
              <style>{`
                @keyframes logo-breathe {
                  0%, 100% { opacity: 0.6; transform: scale(1); }
                  50% { opacity: 1; transform: scale(1.18); }
                }
                @media (prefers-reduced-motion: reduce) {
                  @keyframes logo-breathe { 0%, 100% { opacity: 0.85; transform: scale(1); } }
                }
              `}</style>
            </div>

            {/* The Tower — more commanding, larger headline */}
            <h1
              className="text-6xl md:text-8xl tracking-tight leading-none"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "var(--text-primary)",
                textShadow:
                  "0 4px 40px rgba(0,0,0,0.9), 0 0 80px rgba(201, 168, 76, 0.2), 0 0 160px rgba(201, 168, 76, 0.08)",
                letterSpacing: "-0.03em",
              }}
            >
              The Tower
            </h1>

            {/* Tagline */}
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
            isLoading={isAuthenticating}
            error={visibleError}
            isReturningUser={isReturningUser}
            isAuthenticated={isAuthenticated}
            googleButtonRef={googleButtonRef}
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
                    available
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
              PRIVATE BETA — ACCESS BY KEY
            </span>
            <div
              className="h-px w-12"
              style={{ background: "var(--gold)" }}
            />
          </div>

          {/* ── LEGAL LINKS ── */}
          <nav
            data-animate
            aria-label="Legal and pricing"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            style={{ opacity: 0.45 }}
          >
            {LOBBY_FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-opacity hover:opacity-100"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.16em",
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

        </div>
      </div>
    </div>
  );
}

const LOBBY_FOOTER_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/waitlist", label: "Waitlist" },
] as const;

/**
 * ConstructionTicker — narrow scrolling banner at the very top of the page.
 * JetBrains Mono, 10px, gold text on near-black, infinite horizontal scroll.
 */
function ConstructionTicker(): JSX.Element {
  const TEXT =
    "PRIVATE BETA — ACCESS BY KEY — THE TOWER IS OPENING FLOOR BY FLOOR — PRIVATE BETA — ACCESS BY KEY — THE TOWER IS OPENING FLOOR BY FLOOR — ";

  return (
    <div
      className="fixed top-0 inset-x-0 overflow-hidden"
      style={{
        zIndex: 50,
        height: "26px",
        background: "rgba(4, 5, 12, 0.96)",
        borderBottom: "1px solid rgba(201, 168, 76, 0.15)",
      }}
      aria-label="Private beta access notice"
      role="region"
      aria-live="off"
    >
      {/* Gold accent line at very top */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5) 25%, rgba(232,196,90,0.7) 50%, rgba(201,168,76,0.5) 75%, transparent)" }}
      />

      <div
        className="flex items-center h-full whitespace-nowrap"
        style={{
          display: "inline-flex",
          animation: "ticker-scroll 28s linear infinite",
          willChange: "transform",
        }}
      >
        {/* Duplicate text for seamless loop */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.18em",
            color: "var(--gold)",
            opacity: 0.75,
            paddingRight: "0",
          }}
        >
          {TEXT}
          {TEXT}
        </span>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/**
 * ParticleField — 30 floating gold dust particles using pure CSS keyframe
 * animations. Each has a unique position, drift, duration, and delay for
 * organic variation. Very low opacity (0.1–0.2), slow upward drift.
 */
function ParticleField(): JSX.Element {
  // Pre-defined particle configs for deterministic SSR
  const particles: Array<{
    id: number;
    left: number;
    bottom: number;
    size: number;
    duration: number;
    delay: number;
    drift: number;
    opacity: number;
  }> = [
    { id: 0,  left: 5,   bottom: 10, size: 2, duration: 18, delay: 0,    drift: 15,  opacity: 0.12 },
    { id: 1,  left: 12,  bottom: 20, size: 1, duration: 24, delay: 2.1,  drift: -12, opacity: 0.10 },
    { id: 2,  left: 20,  bottom: 5,  size: 3, duration: 20, delay: 4.5,  drift: 20,  opacity: 0.15 },
    { id: 3,  left: 28,  bottom: 35, size: 1, duration: 30, delay: 1.2,  drift: -8,  opacity: 0.08 },
    { id: 4,  left: 35,  bottom: 15, size: 2, duration: 22, delay: 6.8,  drift: 18,  opacity: 0.13 },
    { id: 5,  left: 42,  bottom: 42, size: 1, duration: 26, delay: 3.3,  drift: -22, opacity: 0.09 },
    { id: 6,  left: 48,  bottom: 8,  size: 2, duration: 19, delay: 8.0,  drift: 10,  opacity: 0.14 },
    { id: 7,  left: 55,  bottom: 28, size: 3, duration: 28, delay: 0.7,  drift: -16, opacity: 0.11 },
    { id: 8,  left: 62,  bottom: 18, size: 1, duration: 21, delay: 5.5,  drift: 24,  opacity: 0.16 },
    { id: 9,  left: 70,  bottom: 38, size: 2, duration: 25, delay: 2.9,  drift: -10, opacity: 0.10 },
    { id: 10, left: 78,  bottom: 12, size: 1, duration: 32, delay: 7.2,  drift: 14,  opacity: 0.08 },
    { id: 11, left: 85,  bottom: 25, size: 2, duration: 20, delay: 1.8,  drift: -20, opacity: 0.13 },
    { id: 12, left: 92,  bottom: 45, size: 3, duration: 23, delay: 9.1,  drift: 8,   opacity: 0.12 },
    { id: 13, left: 8,   bottom: 55, size: 1, duration: 27, delay: 4.0,  drift: -18, opacity: 0.09 },
    { id: 14, left: 18,  bottom: 65, size: 2, duration: 22, delay: 6.3,  drift: 22,  opacity: 0.14 },
    { id: 15, left: 25,  bottom: 72, size: 1, duration: 35, delay: 0.4,  drift: -6,  opacity: 0.07 },
    { id: 16, left: 33,  bottom: 58, size: 2, duration: 19, delay: 8.7,  drift: 16,  opacity: 0.15 },
    { id: 17, left: 40,  bottom: 80, size: 3, duration: 28, delay: 3.6,  drift: -24, opacity: 0.11 },
    { id: 18, left: 50,  bottom: 68, size: 1, duration: 24, delay: 1.5,  drift: 12,  opacity: 0.10 },
    { id: 19, left: 58,  bottom: 52, size: 2, duration: 21, delay: 7.9,  drift: -14, opacity: 0.13 },
    { id: 20, left: 65,  bottom: 75, size: 1, duration: 30, delay: 5.1,  drift: 20,  opacity: 0.08 },
    { id: 21, left: 73,  bottom: 62, size: 2, duration: 26, delay: 2.4,  drift: -10, opacity: 0.12 },
    { id: 22, left: 80,  bottom: 48, size: 3, duration: 18, delay: 9.8,  drift: 18,  opacity: 0.16 },
    { id: 23, left: 88,  bottom: 70, size: 1, duration: 33, delay: 0.9,  drift: -22, opacity: 0.09 },
    { id: 24, left: 95,  bottom: 32, size: 2, duration: 20, delay: 6.6,  drift: 8,   opacity: 0.14 },
    { id: 25, left: 3,   bottom: 82, size: 1, duration: 29, delay: 4.8,  drift: -16, opacity: 0.10 },
    { id: 26, left: 15,  bottom: 90, size: 2, duration: 23, delay: 1.1,  drift: 14,  opacity: 0.13 },
    { id: 27, left: 45,  bottom: 88, size: 1, duration: 38, delay: 7.4,  drift: -8,  opacity: 0.07 },
    { id: 28, left: 68,  bottom: 85, size: 2, duration: 25, delay: 3.0,  drift: 20,  opacity: 0.11 },
    { id: 29, left: 90,  bottom: 78, size: 3, duration: 20, delay: 5.7,  drift: -18, opacity: 0.15 },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 3 }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            bottom: `${p.bottom}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: `rgba(201, 168, 76, ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(201, 168, 76, ${p.opacity * 0.8})`,
            animation: `particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            // CSS custom property for horizontal drift
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes particle-float {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          8% { opacity: 1; }
          88% { opacity: 0.7; }
          100% {
            transform: translateY(-100vh) translateX(var(--drift, 20px)) scale(0.4);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes particle-float {
            0%, 100% { transform: none; opacity: 0; }
          }
        }
      `}</style>
    </div>
  );
}

/**
 * SignInCard — premium glass card with frosted noise texture, 3D tilt (max 3deg),
 * gold top border, and cursor-following hover glow.
 */
function SignInCard({ isLoading, error, isReturningUser, isAuthenticated, googleButtonRef }: {
  isLoading: boolean;
  error: string | null;
  isReturningUser: boolean;
  isAuthenticated: boolean;
  googleButtonRef: React.RefObject<HTMLDivElement | null>;
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
      {/* Frosted noise texture layer */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "120px 120px",
          opacity: 0.035,
          mixBlendMode: "overlay",
        }}
        aria-hidden="true"
      />

      {/* Hover glow that follows cursor */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "220px",
          height: "220px",
          left: `${hoverGlow.x}%`,
          top: `${hoverGlow.y}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(201, 168, 76, 0.08) 0%, transparent 70%)",
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
            {isAuthenticated ? "Welcome Back" : "Enter The Tower"}
          </h2>
          <p
            className="text-sm"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              color: "var(--text-secondary)",
            }}
          >
            {isAuthenticated ? "Take the elevator to any floor" : isReturningUser ? "Resume your session" : "Invited guests continue with Google"}
          </p>
        </div>

        {isAuthenticated ? (
          /* Authenticated: trigger elevator animation to go back up */
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("elevator:navigate", { detail: { floorId: "PH" } }),
              );
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3.5 font-medium transition-all duration-300"
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
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 14V4M9 4L5 8M9 4L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Return to Penthouse</span>
          </button>
        ) : (
          /* Unauthenticated: Google Identity Services owns the button branding. */
          <div
            className="relative flex min-h-[44px] w-full items-center justify-center"
            aria-busy={isLoading}
          >
            <div
              ref={googleButtonRef}
              className={isLoading ? "pointer-events-none opacity-0" : ""}
              aria-hidden={isLoading}
            />
            {isLoading ? (
              <span
                className="absolute inset-0 flex items-center justify-center rounded-lg"
                style={{
                  background: "rgba(19, 19, 20, 0.96)",
                  color: "#E3E3E3",
                  border: "1px solid rgba(142, 145, 143, 0.75)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  letterSpacing: "0.15em",
                }}
              >
                AUTHENTICATING...
              </span>
            ) : null}
          </div>
        )}

        {!isAuthenticated && (
          <a
            href="/waitlist"
            className="text-center transition-opacity hover:opacity-100"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              textDecoration: "none",
              opacity: 0.78,
            }}
          >
            Need a key? Join the waitlist
          </a>
        )}

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
 * DirectoryRow — interactive floor listing with gold left border, hover glow,
 * and a gold shimmer animation that sweeps left-to-right on hover.
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
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg relative overflow-hidden"
      style={{
        opacity: visible ? (available ? 1 : 0.35) : 0,
        transform: visible
          ? available && hovered
            ? "translateX(5px) translateY(-1px)"
            : "translateX(0) translateY(0)"
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
      {/* Gold shimmer sweep on hover — left to right */}
      {available && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(201, 168, 76, 0.06) 40%, rgba(232, 196, 90, 0.14) 50%, rgba(201, 168, 76, 0.06) 60%, transparent 100%)",
            transform: hovered ? "translateX(110%)" : "translateX(-110%)",
            transition: hovered ? "transform 0.55s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
          aria-hidden="true"
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
 * TowerLogo — 2× larger SVG tower mark (80x110 render, 64x88 viewBox).
 * Dramatic drop-shadow filter for depth.
 */
function TowerLogo(): JSX.Element {
  return (
    <svg
      width="80"
      height="110"
      viewBox="0 0 64 88"
      fill="none"
      aria-label="The Tower logo"
      className="relative"
      style={{ filter: "drop-shadow(0 6px 20px rgba(201, 168, 76, 0.5)) drop-shadow(0 0 40px rgba(201, 168, 76, 0.2))" }}
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
