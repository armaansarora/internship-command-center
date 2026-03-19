import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";

export const metadata: Metadata = { title: "The Rolodex Lounge" };

/** Floor 6 — Contacts (Phase 3) */
export default async function RolodexLoungePage() {
  await requireUser();

  return (
    <FloorShell floorId="6">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Warm amber ambient wash */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(180, 110, 40, 0.06) 0%, transparent 70%)",
          }}
        />

        {/* Faded lounge furniture silhouettes — CSS only */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0"
          aria-hidden="true"
          style={{ height: "28%" }}
        >
          {/* Left armchair silhouette */}
          <div
            className="absolute"
            style={{
              left: "12%",
              bottom: "0",
              width: "120px",
              height: "80px",
              background:
                "linear-gradient(to top, rgba(180, 110, 40, 0.08) 0%, transparent 100%)",
              borderRadius: "60px 60px 0 0",
              opacity: 0.6,
            }}
          />
          <div
            className="absolute"
            style={{
              left: "10%",
              bottom: "60px",
              width: "20px",
              height: "60px",
              background: "rgba(180, 110, 40, 0.06)",
              borderRadius: "4px",
              opacity: 0.5,
            }}
          />

          {/* Center sofa silhouette */}
          <div
            className="absolute"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "0",
              width: "220px",
              height: "70px",
              background:
                "linear-gradient(to top, rgba(180, 110, 40, 0.08) 0%, transparent 100%)",
              borderRadius: "50px 50px 0 0",
              opacity: 0.55,
            }}
          />
          <div
            className="absolute"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "55px",
              width: "240px",
              height: "28px",
              background: "rgba(180, 110, 40, 0.05)",
              borderRadius: "8px",
              opacity: 0.5,
            }}
          />

          {/* Right armchair silhouette */}
          <div
            className="absolute"
            style={{
              right: "12%",
              bottom: "0",
              width: "120px",
              height: "80px",
              background:
                "linear-gradient(to top, rgba(180, 110, 40, 0.08) 0%, transparent 100%)",
              borderRadius: "60px 60px 0 0",
              opacity: 0.6,
            }}
          />

          {/* Coffee table */}
          <div
            className="absolute"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "0",
              width: "140px",
              height: "18px",
              background: "rgba(180, 110, 40, 0.07)",
              borderRadius: "4px",
              opacity: 0.5,
            }}
          />
        </div>

        {/* Main card — fades up on mount */}
        <div
          className="floor-card-enter relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(180, 110, 40, 0.18)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "rgba(180, 130, 60, 0.6)", animationDelay: "0.3s" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "rgb(180, 130, 60)" }}
              />
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "var(--gold)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Floor 6
            </span>
          </div>

          {/* Floor name */}
          <h1
            className="mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.4rem, 3vw, 1.875rem)",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            The Rolodex Lounge
          </h1>

          {/* Description */}
          <p
            className="mb-6"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Contact management and networking intelligence. Every relationship, indexed.
          </p>

          {/* COMING SOON badge — glow pulse */}
          <div className="mb-8">
            <span
              className="coming-soon-glow"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(201, 168, 76, 0.7)",
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Animated card stack — fans out with idle breathing animation */}
          <div
            className="flex items-end mb-4"
            aria-hidden="true"
            style={{ position: "relative", height: "52px" }}
          >
            {([
              { rot: "-10deg", tx: "0px",  ty: "6px",  delay: "0s",    zIdx: 1 },
              { rot: "-5deg",  tx: "14px", ty: "3px",  delay: "0.15s", zIdx: 2 },
              { rot: "0deg",   tx: "28px", ty: "0px",  delay: "0.3s",  zIdx: 3 },
              { rot: "5deg",   tx: "42px", ty: "3px",  delay: "0.45s", zIdx: 2 },
              { rot: "10deg",  tx: "56px", ty: "6px",  delay: "0.6s",  zIdx: 1 },
            ] as { rot: string; tx: string; ty: string; delay: string; zIdx: number }[]).map((card, i) => (
              <div
                key={i}
                className="absolute rounded-md"
                style={{
                  width: "56px",
                  height: "36px",
                  left: card.tx,
                  bottom: "0",
                  zIndex: card.zIdx,
                  background: `rgba(180, 130, 60, ${0.12 + i * 0.04})`,
                  border: "1px solid rgba(180, 130, 60, 0.28)",
                  transformOrigin: "bottom center",
                  // CSS custom props for the idle animation
                  ["--card-rot" as string]: card.rot,
                  ["--card-ty" as string]: card.ty,
                  transform: `rotate(${card.rot}) translateY(${card.ty})`,
                  animation: `card-fan-idle 3.5s ease-in-out ${card.delay} infinite`,
                }}
              />
            ))}
          </div>

          {/* Phase indicator */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Phase 3 — Scheduled
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
