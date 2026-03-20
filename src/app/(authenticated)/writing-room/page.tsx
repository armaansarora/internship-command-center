import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorStub } from "@/components/world/FloorStub";

export const metadata: Metadata = { title: "The Writing Room" };

/** Floor 5 — Cover Letters (Phase 4) */
export default async function WritingRoomPage() {
  await requireUser();

  return (
    <FloorStub
      floorId="5"
      floorLabel="Floor 5"
      floorName="The Writing Room"
      description={
        <>
          AI-powered cover letters tailored to every application. Every word, earned.{" "}
          <span
            className="cursor-blink inline-block align-middle"
            aria-hidden="true"
            style={{
              width: "2px",
              height: "14px",
              background: "rgba(201, 168, 76, 0.7)",
              verticalAlign: "middle",
              marginBottom: "1px",
            }}
          />
        </>
      }
      phase="Phase 4 — Planned"
      accentColor="rgba(201, 168, 76, 0.7)"
      accentRgb="201, 168, 76"
      cardBorderColor="rgba(201, 168, 76, 0.12)"
      pingDelay="0.6s"
      atmosphereRenderer={
        <>
          {/* Ruled-line texture — literary feel */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(201, 168, 76, 0.04) 31px, rgba(201, 168, 76, 0.04) 32px)",
              backgroundSize: "100% 32px",
            }}
          />
          {/* Left margin rule — classic notebook detail */}
          <div
            className="pointer-events-none absolute inset-y-0"
            aria-hidden="true"
            style={{
              left: "8%",
              width: "1px",
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(180, 60, 60, 0.08) 15%, rgba(180, 60, 60, 0.06) 85%, transparent 100%)",
            }}
          />
        </>
      }
      previewSlot={
        <div
          className="rounded-lg p-4 mb-4 overflow-hidden"
          aria-hidden="true"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            position: "relative",
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: "1px",
                background: "rgba(201, 168, 76, 0.06)",
                marginBottom: "16px",
                width: i === 2 ? "65%" : i === 5 ? "40%" : "100%",
              }}
            />
          ))}
          <div
            className="cursor-blink"
            style={{
              width: "2px",
              height: "14px",
              background: "rgba(201, 168, 76, 0.55)",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
        </div>
      }
    />
  );
}
