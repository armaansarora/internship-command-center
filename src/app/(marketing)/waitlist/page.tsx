import type { Metadata } from "next";
import { LAUNCH_CONFIG } from "@/lib/launch-config";
import { WaitlistForm } from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description: `Be among the first to enter ${LAUNCH_CONFIG.brand.name}.`,
  alternates: { canonical: `${LAUNCH_CONFIG.brand.url()}/waitlist` },
};

export default function WaitlistPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center py-12 text-center md:py-20">
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(201, 168, 76, 0.7)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Limited entry
      </p>
      <h1
        className="mt-3"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(40px, 6vw, 64px)",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        Step into the lobby.
      </h1>
      <p
        className="mt-5 max-w-lg"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "17px",
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.55,
        }}
      >
        {LAUNCH_CONFIG.brand.tagline} We&apos;re letting people in slowly so the building stays well-staffed. Join the list and we&apos;ll send you a key.
      </p>

      <div className="mt-10 w-full max-w-md">
        <WaitlistForm />
      </div>

      <p
        className="mt-12"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
        }}
      >
        We email you once. No drip campaigns, no marketing, no resold lists.
      </p>
    </div>
  );
}
