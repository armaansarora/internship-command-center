import { useState, useEffect, useRef, startTransition, type JSX } from "react";
import { GlassPanel } from "./GlassPanel";

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */

export interface StatCardConfig {
  label: string;
  value: number;
  suffix: string;
  icon: JSX.Element;
  /** CSS colour value — typically a CSS variable like `var(--gold)` */
  accentColor: string;
}

interface StatCardProps {
  stat: StatCardConfig;
  /** Milliseconds to delay the entrance animation */
  delay: number;
}

/* ──────────────────────────────────────────────────────────────
   HOOK — useCountUp
   Animates from 0 → target over 1500ms with cubic ease-out.
   Returns the current display value and a pulsing flag for the
   glow animation that fires when counting finishes.
   ────────────────────────────────────────────────────────────── */
function useCountUp(target: number): { display: number; pulsing: boolean } {
  const [display, setDisplay] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      startTransition(() => setDisplay(0));
      return;
    }
    startRef.current = performance.now();
    const duration = 1500;

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 800);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return { display, pulsing };
}

/* ──────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────── */

/**
 * StatCard — animated counter inside a GlassPanel.
 * The accent colour drives both the top-border tint and the
 * displayed value colour / counter-pulse glow.
 */
export function StatCard({ stat, delay }: StatCardProps): JSX.Element {
  const { display, pulsing } = useCountUp(stat.value);

  return (
    <GlassPanel accentColor={stat.accentColor} className="p-5 flex flex-col gap-3" delay={delay}>
      {/* Label + icon row */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {stat.label}
        </span>
        {stat.icon}
      </div>

      {/* Value row */}
      <div className="flex items-end gap-1.5">
        <span
          className="text-3xl"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums lining-nums",
            color: stat.accentColor,
            lineHeight: 1,
            animation: pulsing ? "counter-pulse 0.8s ease-in-out" : "none",
            // CSS custom property consumed by the counter-pulse keyframe
            ["--pulse-color" as string]: `${stat.accentColor}80`,
          }}
        >
          {stat.value > 0 ? display : "—"}
        </span>
        {stat.suffix && (
          <span
            className="mb-1"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "18px",
              color: stat.accentColor,
              opacity: 0.7,
            }}
          >
            {stat.suffix}
          </span>
        )}
      </div>
    </GlassPanel>
  );
}
