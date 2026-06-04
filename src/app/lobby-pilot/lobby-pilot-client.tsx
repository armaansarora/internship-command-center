"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useState } from "react";

import { Mascot } from "@/components/identity/Mascot";
import { TowerCompanion, type CompanionDiagnostic } from "@/components/identity/TowerCompanion";

type Engine = "png" | "rive" | "video";

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
const segGroup: CSSProperties = {
  display: "inline-flex",
  border: `1px solid ${GOLD}33`,
  borderRadius: 999,
  padding: 3,
  background: "rgba(255,255,255,0.03)",
};
const segBtn = (active: boolean): CSSProperties => ({
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: active ? NAVY : "#A9AEC4",
  background: active ? GOLD : "transparent",
  border: "none",
  borderRadius: 999,
  padding: "8px 16px",
  cursor: "pointer",
});

export function LobbyPilotClient(): JSX.Element {
  const [perch, setPerch] = useState(0);
  const [engine, setEngine] = useState<Engine>("png");
  const [status, setStatus] = useState<CompanionDiagnostic | null>(null);
  // Stable identity so TowerCompanion's status effect doesn't re-fire each render.
  const handleStatus = useCallback((d: CompanionDiagnostic) => setStatus(d), []);

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

        {/* ── Companion (prototype) ────────────────────────────────── */}
        <section style={sectionGap} aria-labelledby="comp-h">
          <p style={eyebrow}>Your Tower companion · prototype</p>
          <h2 id="comp-h" style={h2}>It perches, floats, and glides to you</h2>
          <p style={sub}>
            The owl is pinned to a corner of this page right now — watch it idle (barely-perceptible
            float), then send it gliding to the next corner. Click the owl to say hi. GSAP owns
            <em> where </em> it sits; the engine below owns what its body <em>does</em>.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setPerch((p) => p + 1)}
              style={{
                fontFamily: mono,
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: NAVY,
                background: GOLD,
                border: `1px solid ${GOLD}`,
                borderRadius: 999,
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Send it flying →
            </button>
            <span style={label}>glides to the next corner</span>
          </div>

          {/* Engine toggle: flat puppet · rigged Rive · baked video loop. */}
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div role="group" aria-label="Companion animation engine" style={segGroup}>
              <button
                type="button"
                aria-pressed={engine === "png"}
                onClick={() => setEngine("png")}
                style={segBtn(engine === "png")}
              >
                GSAP (alive)
              </button>
              <button
                type="button"
                aria-pressed={engine === "rive"}
                onClick={() => setEngine("rive")}
                style={segBtn(engine === "rive")}
              >
                Rive (rigged)
              </button>
              <button
                type="button"
                aria-pressed={engine === "video"}
                onClick={() => setEngine("video")}
                style={segBtn(engine === "video")}
              >
                Video (baked)
              </button>
            </div>
            <span style={label}>
              {engine === "rive"
                ? "loads /brand/owl.riv · falls back to the GSAP owl until a rig is dropped in"
                : engine === "video"
                  ? "loads /brand/owl-idle.mov + .webm · real baked breathe · falls back to the GSAP owl until the clip is dropped in"
                  : "breathe · greet on click · hover perk · float + glide (no flap — that needs the rig)"}
            </span>
          </div>

          {/* Live read-out of what the active engine's asset actually contains — so a
              missing/mis-authored .riv or video is visible instead of silently falling back. */}
          {status && status.engine === engine ? <CompanionStatusPill status={status} /> : null}
        </section>

        <footer style={{ ...sectionGap, ...label, lineHeight: 1.8 }}>
          Decision: <code style={{ color: GOLD, fontFamily: mono }}>docs/research/mascots/MASCOT-DECISION.md</code>
          <br />
          Additive · behind <code style={{ color: GOLD, fontFamily: mono }}>/lobby-pilot</code> · nothing on main touched.
        </footer>
      </div>

      <TowerCompanion
        perchIndex={perch}
        engine={engine}
        riveSrc="/brand/owl.riv"
        onStatus={handleStatus}
      />
    </main>
  );
}

/**
 * CompanionStatusPill — surfaces what the active engine's asset actually is, so the
 * author → drop-in loop is self-diagnosing (no more "I dropped it in and nothing
 * changed"). For Rive it reads the loaded animation/state-machine names; for video
 * it reflects whether the baked loop actually started playing.
 */
function CompanionStatusPill({ status }: { status: CompanionDiagnostic }): JSX.Element {
  const named = (xs: string[]): string => (xs.length ? xs.map((s) => `“${s}”`).join(", ") : "none");

  let tone = "#8A90A6";
  let dot = "#8A90A6";
  let text = "";

  if (status.engine === "video") {
    switch (status.phase) {
      case "loading":
        text = "Loading owl video — /brand/owl-idle…";
        break;
      case "live":
        tone = GOLD;
        dot = "#6FCF8E";
        text = "Video live — the owl is breathing (baked loop). ✓";
        break;
      case "failed":
        dot = "#C96A5A";
        text =
          "No owl video at /brand/owl-idle.{mov,webm} yet — showing the GSAP owl. Generate the clip (Kling → transparent WebM + HEVC .mov) and drop both into public/brand/.";
        break;
      case "reduced-motion":
        text = "Reduced motion is on — showing the lit still (video never loads).";
        break;
    }
  } else {
    switch (status.phase) {
      case "loading":
        text = "Loading rig — /brand/owl.riv…";
        break;
      case "live":
        tone = GOLD;
        dot = "#6FCF8E";
        text = "Rig live — playing the “Idle” animation via Rive. ✓";
        break;
      case "missing-idle":
        tone = "#E2B341";
        dot = "#E2B341";
        text =
          `Loaded, but no animation named “Idle”. Found animations: ${named(status.animations)}` +
          (status.stateMachines.length ? `; state machines: ${named(status.stateMachines)}` : "") +
          ". Rename your Rive animation to exactly “Idle” and re-export.";
        break;
      case "failed":
        dot = "#C96A5A";
        text =
          "No rig at /brand/owl.riv yet — showing the GSAP owl. Export from Rive (Export → For runtime) and save it as public/brand/owl.riv.";
        break;
      case "reduced-motion":
        text = "Reduced motion is on — showing the lit still (Rive never loads).";
        break;
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginTop: 14,
        maxWidth: 620,
        padding: "10px 14px",
        borderRadius: 12,
        border: `1px solid ${tone}33`,
        background: "rgba(255,255,255,0.03)",
        fontFamily: mono,
        fontSize: 12,
        lineHeight: 1.55,
        color: tone,
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "0 0 auto",
          width: 8,
          height: 8,
          marginTop: 5,
          borderRadius: 999,
          background: dot,
          boxShadow: `0 0 8px ${dot}99`,
        }}
      />
      <span>{text}</span>
    </div>
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
