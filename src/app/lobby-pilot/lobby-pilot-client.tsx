"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useState } from "react";

import { FloorMark, type FloorMarkState } from "@/components/identity/FloorMark";
import { FLOORS } from "@/lib/config/floors.config";

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
const card: CSSProperties = {
  background: "rgba(28, 28, 48, 0.55)",
  border: "1px solid rgba(201, 168, 76, 0.18)",
  borderRadius: 20,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  padding: "clamp(20px, 3vw, 32px)",
};
const sectionGap: CSSProperties = { marginTop: 56 };
const label: CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8A90A6",
};

function Btn({
  children,
  active,
  onClick,
}: {
  children: string;
  active?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ?? undefined}
      style={{
        fontFamily: mono,
        fontSize: 12,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: active ? NAVY : CREAM,
        background: active ? GOLD : "transparent",
        border: `1px solid ${active ? GOLD : "rgba(201,168,76,0.4)"}`,
        borderRadius: 999,
        padding: "9px 18px",
        cursor: "pointer",
        transition: "all 200ms ease",
      }}
    >
      {children}
    </button>
  );
}

export function LobbyPilotClient(): JSX.Element {
  const [demoState, setDemoState] = useState<FloorMarkState>("idle");
  const [notifyKey, setNotifyKey] = useState(0);

  const fireNotify = useCallback(() => {
    setDemoState("notify");
    setNotifyKey((k) => k + 1);
    window.setTimeout(() => setDemoState("idle"), 1100);
  }, []);

  return (
    <main style={page}>
      <div style={shell}>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header style={{ display: "flex", gap: "clamp(20px,4vw,48px)", alignItems: "center", flexWrap: "wrap" }}>
          <FloorMark floor="L" size={148} ground state="idle" />
          <div>
            <p style={eyebrow}>The Tower · Identity Pilot</p>
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
              The Keystone
            </h1>
            <p style={{ ...sub, maxWidth: 540 }}>
              A matte-gold Art-Deco tower crowned by a keystone cornice, with a lit archway you enter
              and one warm light that breathes. Live behind <code style={{ color: GOLD, fontFamily: mono }}>/lobby-pilot</code>{" "}
              only; the real lobby is untouched.
            </p>
          </div>
        </header>

        {/* ── Live motion states ───────────────────────────────────── */}
        <section style={sectionGap} aria-labelledby="states-h">
          <p style={eyebrow}>Motion grammar</p>
          <h2 id="states-h" style={h2}>Four states + a designed still</h2>
          <p style={sub}>
            The gold body never moves — all life is in the light. Hover any mark to bloom it; fire
            the active and notify states below. Reduced-motion resolves to a fully-lit still.
          </p>
          <div style={{ ...card, ...{ marginTop: 20 } }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 20,
                alignItems: "end",
              }}
            >
              <Cell name="Idle · breathe"><FloorMark floor="L" size={120} ground state="idle" /></Cell>
              <Cell name="Hover · bloom (hover me)"><FloorMark floor="L" size={120} ground state="idle" /></Cell>
              <Cell name="Active · thinking"><FloorMark floor="L" size={120} ground state="active" /></Cell>
              <Cell name="Live · use the buttons">
                <FloorMark key={notifyKey} floor="L" size={120} ground state={demoState} />
              </Cell>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <Btn active={demoState === "active"} onClick={() => setDemoState((s) => (s === "active" ? "idle" : "active"))}>
                {demoState === "active" ? "Stop thinking" : "Thinking…"}
              </Btn>
              <Btn onClick={fireNotify}>Fire notify</Btn>
            </div>
          </div>
        </section>

        {/* ── 24px grayscale ship-gate ─────────────────────────────── */}
        <section style={sectionGap} aria-labelledby="gate-h">
          <p style={eyebrow}>The ship-gate</p>
          <h2 id="gate-h" style={h2}>Reads at 24px, in grayscale</h2>
          <p style={sub}>
            The mark must stay instantly nameable as a keystone-with-lit-passage at favicon size,
            with the doorway a clean void in bare silhouette.
          </p>
          <div style={{ ...card, marginTop: 20, display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-end" }}>
            {[96, 48, 24].map((s) => (
              <Cell key={s} name={`${s}px`}><FloorMark floor="L" size={s} ground state="idle" /></Cell>
            ))}
            <Cell name="24px grayscale">
              <div style={{ filter: "grayscale(1)" }}><FloorMark floor="L" size={24} ground state="idle" /></div>
            </Cell>
            <Cell name="silhouette">
              <div style={{ filter: "brightness(0) invert(1)" }}>
                <FloorMark floor="L" size={72} state="idle" />
              </div>
            </Cell>
          </div>
        </section>

        {/* ── One mark, nine floors ────────────────────────────────── */}
        <section style={sectionGap} aria-labelledby="floors-h">
          <p style={eyebrow}>One mark, nine floors</p>
          <h2 id="floors-h" style={h2}>The accent is the only thing that moves</h2>
          <p style={sub}>
            One locked silhouette across the whole building; each floor tints only the soul light
            (<code style={{ color: GOLD, fontFamily: mono }}>floors.config.ts</code>).
          </p>
          <div
            style={{
              ...card,
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 18,
            }}
          >
            {FLOORS.map((f) => (
              <Cell key={f.id} name={`${f.label} · ${f.name.replace("The ", "")}`}>
                <FloorMark floor={f.id} size={84} ground state="idle" />
              </Cell>
            ))}
          </div>
        </section>

        <footer style={{ ...sectionGap, ...label, lineHeight: 1.8 }}>
          Spec: <code style={{ color: GOLD, fontFamily: mono }}>docs/MARK-SPEC.md</code> · Decision trail:{" "}
          <code style={{ color: GOLD, fontFamily: mono }}>docs/MORNING-REVIEW.md</code> · Gallery:{" "}
          <code style={{ color: GOLD, fontFamily: mono }}>docs/glyph-autopilot-review.html</code>
          <br />
          Override any pick from <code style={{ color: GOLD, fontFamily: mono }}>docs/MORNING-REVIEW.md</code> — additive, behind this route, nothing on main touched.
        </footer>
      </div>
    </main>
  );
}

function Cell({ name, children }: { name: string; children: JSX.Element }): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {children}
      <span style={label}>{name}</span>
    </div>
  );
}
