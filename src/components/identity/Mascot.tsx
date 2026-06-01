import type { CSSProperties, JSX } from "react";
import Image from "next/image";

/**
 * Mascot — The Tower's owl, the brand's friendly face.
 *
 * Two renders, one character: the **cream** owl for the dark UI (light figure on
 * navy) and the **navy** owl for the eventual light UI (dark figure on light).
 * When light/dark mode lands, `mode` flips the two for contrast — same owl,
 * inverted. For now the app is dark, so `mode` defaults to `"dark"` (cream owl).
 *
 * The **cream** owl is a transparent cutout, so it floats on any surface — that's
 * the default (`tile` off). The **navy** owl still carries its flat navy backdrop
 * (auto-keying navy-on-navy frays), so render it with `tile` until it gets a clean
 * transparent version when light mode is built.
 */
export type MascotMode = "dark" | "light";

export interface MascotProps {
  /** Which UI mode this instance lives in. "dark" → cream owl, "light" → navy owl. Default "dark". */
  mode?: MascotMode;
  /** Rendered square size in px. Default 160. */
  size?: number;
  /** Wrap in the rounded app-icon tile (hairline gold edge + soft shadow). Default false (float). */
  tile?: boolean;
  /** Prioritise loading (use for the above-the-fold hero). Default false. */
  priority?: boolean;
  /** Accessible label. */
  alt?: string;
  className?: string;
}

const OWL: Record<MascotMode, string> = {
  dark: "/brand/owl-cream.png",
  light: "/brand/owl-navy.png",
};

const NAVY = "#1A1A2E";
const GOLD = "#C9A84C";

export function Mascot({
  mode = "dark",
  size = 160,
  tile = false,
  priority = false,
  alt,
  className,
}: MascotProps): JSX.Element {
  const label = alt ?? "The Tower — the owl";
  const radius = Math.round(size * 0.22);

  const img = (
    <Image
      src={OWL[mode]}
      alt={label}
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      style={{ display: "block", width: size, height: size, borderRadius: tile ? radius : 0 }}
    />
  );

  if (!tile) return img;

  const wrap: CSSProperties = {
    display: "inline-block",
    borderRadius: radius,
    background: NAVY,
    border: `1px solid ${GOLD}33`,
    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
    overflow: "hidden",
    lineHeight: 0,
  };

  return (
    <span className={className} style={wrap}>
      {img}
    </span>
  );
}
