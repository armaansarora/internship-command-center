"use client";

import type { CSSProperties, JSX } from "react";

import { Mascot } from "@/components/identity/Mascot";

const NAVY = "#1A1A2E";
const GOLD = "#C9A84C";
const CREAM = "#F5F1E8";

const playfair = "var(--font-playfair), Georgia, serif";
const mono = "var(--font-jetbrains), ui-monospace, monospace";

const page: CSSProperties = {
  minHeight: "100vh",
  background: `radial-gradient(120% 90% at 50% -10%, #20203a 0%, ${NAVY} 55%, #121225 100%)`,
  color: CREAM,
  fontFamily: "Satoshi, system-ui, sans-serif",
  padding: "clamp(28px, 6vw, 88px) clamp(20px, 5vw, 64px) 96px",
};
const shell: CSSProperties = { maxWidth: 1080, margin: "0 auto" };
const eyebrow: CSSProperties = {
  fontFamily: mono,
  fontSize: 12,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: GOLD,
  opacity: 0.85,
};
const h2: CSSProperties = {
  fontFamily: playfair,
  fontWeight: 600,
  fontSize: "clamp(20px, 3vw, 28px)",
  margin: "0 0 4px",
  color: CREAM,
};
const sub: CSSProperties = { color: "#A9AEC4", fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 620 };
const sectionGap: CSSProperties = { marginTop: 56 };
const label: CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8A90A6",
};

export function LobbyPilotClient(): JSX.Element {
  return (
    <main style={page}>
      <div style={shell}>
        {/* ── The mascot (the owl) ─────────────────────────────────── */}
        <header style={{ display: "flex", gap: "clamp(20px,4vw,48px)", alignItems: "center", flexWrap: "wrap" }}>
          <Mascot mode="dark" size={172} priority />
          <div>
            <p style={eyebrow}>The Tower · The mascot</p>
            <h1
              style={{
                fontFamily: playfair,
                fontWeight: 700,
                fontSize: "clamp(38px, 7vw, 66px)",
                lineHeight: 1.02,
                margin: "10px 0 12px",
                color: CREAM,
              }}
            >
              The Owl
            </h1>
            <p style={{ ...sub, maxWidth: 560 }}>
              The Tower&rsquo;s friendly face. The <strong style={{ color: CREAM }}>cream owl</strong> is the
              mascot for the dark UI now; when light mode lands, the{" "}
              <strong style={{ color: CREAM }}>navy owl</strong> takes over — the same character, inverted
              for contrast. Cream on dark, navy on light.
            </p>
          </div>
        </header>

        {/* ── Light / dark twin ────────────────────────────────────── */}
        <section style={sectionGap} aria-labelledby="twin-h">
          <p style={eyebrow}>One owl, two modes</p>
          <h2 id="twin-h" style={h2}>It flips with the theme</h2>
          <p style={sub}>
            The two renders become the same mark in either theme — cream for dark, navy for light.
            Light mode is wired later; this is the swap.
          </p>
          <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
            <Swatch bg={NAVY} caption="Dark · now (transparent)">
              <Mascot mode="dark" size={132} />
            </Swatch>
            <Swatch bg={CREAM} caption="Light · later (needs cutout)">
              <Mascot mode="light" size={132} tile />
            </Swatch>
          </div>
        </section>

        <footer style={{ ...sectionGap, ...label, lineHeight: 1.8 }}>
          Decision: <code style={{ color: GOLD, fontFamily: mono }}>docs/research/mascots/MASCOT-DECISION.md</code>
          <br />
          Additive · behind <code style={{ color: GOLD, fontFamily: mono }}>/lobby-pilot</code> · nothing on main touched.
        </footer>
      </div>
    </main>
  );
}

function Swatch({
  bg,
  caption,
  children,
}: {
  bg: string;
  caption: string;
  children: JSX.Element;
}): JSX.Element {
  const onCream = bg === CREAM;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        style={{
          background: bg,
          border: "1px solid rgba(201,168,76,0.18)",
          borderRadius: 20,
          padding: "clamp(20px, 3vw, 32px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
      <span style={{ ...label, color: onCream ? "#6B7088" : "#8A90A6" }}>{caption}</span>
    </div>
  );
}
