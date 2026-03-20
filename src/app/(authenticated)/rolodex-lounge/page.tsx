import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The Rolodex Lounge" };

/** Floor 6 — Contacts (Phase 3) */
export default async function RolodexLoungePage() {
  await requireUser();

  const cardFan = [
    { rot: "-10deg", tx: "0px",  ty: "6px",  delay: "0s",    zIdx: 1 },
    { rot: "-5deg",  tx: "14px", ty: "3px",  delay: "0.15s", zIdx: 2 },
    { rot: "0deg",   tx: "28px", ty: "0px",  delay: "0.3s",  zIdx: 3 },
    { rot: "5deg",   tx: "42px", ty: "3px",  delay: "0.45s", zIdx: 2 },
    { rot: "10deg",  tx: "56px", ty: "6px",  delay: "0.6s",  zIdx: 1 },
  ] as const;

  return (
    <FloorStub
      floorId="6"
      floorLabel="Floor 6"
      floorName="The Rolodex Lounge"
      description="Contact management and networking intelligence. Every relationship, indexed."
      phase="Phase 3 — Scheduled"
      accentColor="rgba(201, 168, 76, 0.7)"
      accentRgb="180, 130, 60"
      cardBorderColor="rgba(180, 110, 40, 0.18)"
      pingDelay="0.3s"
      atmosphereRenderer={
        <>
          {/* Warm amber ambient wash */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(180, 110, 40, 0.06) 0%, transparent 70%)",
            }}
          />
          {/* Lounge furniture silhouettes */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0"
            aria-hidden="true"
            style={{ height: "28%" }}
          >
            {/* Left armchair */}
            <div
              className="absolute"
              style={{
                left: "12%", bottom: "0",
                width: "120px", height: "80px",
                background: "linear-gradient(to top, rgba(180, 110, 40, 0.08) 0%, transparent 100%)",
                borderRadius: "60px 60px 0 0",
                opacity: 0.6,
              }}
            />
            <div
              className="absolute"
              style={{
                left: "10%", bottom: "60px",
                width: "20px", height: "60px",
                background: "rgba(180, 110, 40, 0.06)",
                borderRadius: "4px",
                opacity: 0.5,
              }}
            />
            {/* Center sofa */}
            <div
              className="absolute"
              style={{
                left: "50%", transform: "translateX(-50%)",
                bottom: "0", width: "220px", height: "70px",
                background: "linear-gradient(to top, rgba(180, 110, 40, 0.08) 0%, transparent 100%)",
                borderRadius: "50px 50px 0 0",
                opacity: 0.55,
              }}
            />
            <div
              className="absolute"
              style={{
                left: "50%", transform: "translateX(-50%)",
                bottom: "55px", width: "240px", height: "28px",
                background: "rgba(180, 110, 40, 0.05)",
                borderRadius: "8px",
                opacity: 0.5,
              }}
            />
            {/* Right armchair */}
            <div
              className="absolute"
              style={{
                right: "12%", bottom: "0",
                width: "120px", height: "80px",
                background: "linear-gradient(to top, rgba(180, 110, 40, 0.08) 0%, transparent 100%)",
                borderRadius: "60px 60px 0 0",
                opacity: 0.6,
              }}
            />
            {/* Coffee table */}
            <div
              className="absolute"
              style={{
                left: "50%", transform: "translateX(-50%)",
                bottom: "0", width: "140px", height: "18px",
                background: "rgba(180, 110, 40, 0.07)",
                borderRadius: "4px",
                opacity: 0.5,
              }}
            />
          </div>
        </>
      }
      previewSlot={
        <div
          className="flex items-end mb-4"
          aria-hidden="true"
          style={{ position: "relative", height: "52px" }}
        >
          {cardFan.map((card, i) => (
            <div
              key={i}
              className="absolute rounded-md"
              style={{
                width: "56px", height: "36px",
                left: card.tx, bottom: "0",
                zIndex: card.zIdx,
                background: `rgba(180, 130, 60, ${0.12 + i * 0.04})`,
                border: "1px solid rgba(180, 130, 60, 0.28)",
                transformOrigin: "bottom center",
                ["--card-rot" as string]: card.rot,
                ["--card-ty" as string]: card.ty,
                transform: `rotate(${card.rot}) translateY(${card.ty})`,
                animation: `card-fan-idle 3.5s ease-in-out ${card.delay} infinite`,
              }}
            />
          ))}
        </div>
      }
    />
  );
}
