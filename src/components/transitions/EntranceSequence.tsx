"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import gsap from "gsap";

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
 */
export function EntranceSequence({ children }: { children: React.ReactNode }): JSX.Element {
  const [showEntrance, setShowEntrance] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);

  useEffect(() => {
    // Skip if already played this session
    if (typeof window === "undefined") return;

    const played = sessionStorage.getItem("tower-entrance-played");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (played || prefersReduced) {
      setShowEntrance(false);
      return;
    }

    setShowEntrance(true);
  }, []);

  useEffect(() => {
    if (!showEntrance || hasPlayed.current) return;
    hasPlayed.current = true;

    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setShowEntrance(false);
        sessionStorage.setItem("tower-entrance-played", "1");
      },
    });

    // Initial state
    gsap.set(overlay, { opacity: 1 });
    gsap.set(content, { opacity: 0, y: 30, filter: "blur(8px)" });

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
      }, "-=0.4") // Overlap with overlay fade

      // Phase 4: Brief pause to let it breathe
      .to({}, { duration: 0.2 });

    return () => {
      tl.kill();
    };
  }, [showEntrance]);

  if (!showEntrance) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Content with entrance animation */}
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
