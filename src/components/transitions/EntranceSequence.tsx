"use client";

import { useEffect, useRef, useState, startTransition, type JSX } from "react";
import { gsap } from "@/lib/gsap-init";

/**
 * EntranceSequence — cinematic first-login entrance animation.
 *
 * Sequence:
 * 1. Start from black (elevator doors metaphor)
 * 2. Fade in skyline with a subtle blur-to-sharp focus transition
 * 3. Dashboard panels slide into position from below
 *
 * Duration: ~2s total. Skipped on return visits (sessionStorage flag).
 * Respects prefers-reduced-motion.
 *
 * BUG FIX: Previous version had a race condition where content flashed
 * visible then went to opacity:0. Now we start with opacity:0 and
 * always animate to visible, or skip animation entirely.
 */
export function EntranceSequence({ children }: { children: React.ReactNode }): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState<boolean | null>(null);
  const hasPlayed = useRef(false);

  // Determine on mount whether to animate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const played = sessionStorage.getItem("tower-entrance-played");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (played || prefersReduced) {
      startTransition(() => setShouldAnimate(false));
    } else {
      startTransition(() => setShouldAnimate(true));
    }
  }, []);

  // Run the GSAP animation
  useEffect(() => {
    if (shouldAnimate !== true || hasPlayed.current) return;
    hasPlayed.current = true;

    const content = contentRef.current;
    const overlay = overlayRef.current;
    if (!content || !overlay) return;

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem("tower-entrance-played", "1");
        // Clean up inline styles so CSS takes over
        gsap.set(content, { clearProps: "all" });
        gsap.set(overlay, { clearProps: "all" });
        if (overlay.parentElement) {
          overlay.style.display = "none";
        }
      },
    });

    // Initial state: content hidden, overlay opaque
    gsap.set(content, { opacity: 0, y: 30, filter: "blur(8px)" });
    gsap.set(overlay, { opacity: 1, display: "block" });

    tl
      // Phase 1: Hold on black briefly (0.3s)
      .to({}, { duration: 0.3 })

      // Phase 2: Fade out black overlay (0.8s) — skyline reveals
      .to(overlay, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      })

      // Phase 3: Content blur-to-sharp + slide up (0.8s)
      .to(content, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "power3.out",
      }, "-=0.4")

      // Phase 4: Brief pause
      .to({}, { duration: 0.2 });

    return () => {
      tl.kill();
      // If timeline killed early, make content visible
      if (content) {
        gsap.set(content, { clearProps: "all" });
      }
    };
  }, [shouldAnimate]);

  // Still determining — render hidden to avoid flash
  if (shouldAnimate === null) {
    return (
      <div style={{ opacity: 0 }}>
        {children}
      </div>
    );
  }

  // No animation needed — render immediately
  if (shouldAnimate === false) {
    return <>{children}</>;
  }

  // Animate: content starts hidden, overlay starts opaque
  return (
    <>
      <div ref={contentRef} style={{ opacity: 0 }}>
        {children}
      </div>

      {/* Black overlay that fades out */}
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 100,
          backgroundColor: "#0A0A14",
        }}
        aria-hidden="true"
      />
    </>
  );
}
