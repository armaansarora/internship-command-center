import { ImageResponse } from "next/og";
import { LAUNCH_CONFIG } from "@/lib/launch-config";

export const runtime = "edge";
export const alt = `${LAUNCH_CONFIG.brand.name} — ${LAUNCH_CONFIG.brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Open Graph card. Renders to PNG at request time, cached at the CDN edge.
 * Tower aesthetic: night sky gradient, gold accent, Playfair display + mono
 * subtext. No external font fetch — Edge runtime can't cleanly hit Google
 * Fonts, so we use a system serif fallback that approximates Playfair.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(201, 168, 76, 0.12) 0%, transparent 60%), linear-gradient(180deg, #0A0A14 0%, #1A1A2E 100%)",
          color: "#FFFFFF",
        }}
      >
        {/* Top strip — wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#C9A84C",
              fontFamily: "serif",
              letterSpacing: "0.02em",
            }}
          >
            {LAUNCH_CONFIG.brand.name}
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "monospace",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {LAUNCH_CONFIG.brand.domain}
          </div>
        </div>

        {/* Center — tagline as the main visual */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              fontSize: "84px",
              fontWeight: 700,
              fontFamily: "serif",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            An immersive command center for the internship search.
          </div>
        </div>

        {/* Bottom strip — provenance bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "14px",
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "2px",
              background: "#C9A84C",
            }}
          />
          <span>Floors 1–7 · 8 AI agents · Day-night cycle</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
