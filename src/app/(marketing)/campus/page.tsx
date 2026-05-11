import type { Metadata } from "next";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { LEGAL_CONFIG } from "@/lib/config/legal-config";
import { CampusInquiryForm } from "./campus-inquiry-form";

const BRAND_URL = GATE_CONFIG.brand.url();

export const metadata: Metadata = {
  title: "Tower for Campus Career Centers",
  description:
    "Counselor visibility, outcome reporting, and cohort matching for university career centers. Pilots from $1,500 / semester.",
  alternates: { canonical: `${BRAND_URL}/campus` },
  openGraph: {
    title: "Tower for Campus Career Centers",
    description:
      "Run a Tower campus pilot — counselor visibility, outcome reporting, cohort matching.",
    url: `${BRAND_URL}/campus`,
    type: "website",
  },
};

const PITCH: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Counselor visibility",
    body: "Career counselors see (with student consent) where each student is in their search: applications submitted, interviews coming up, offers received. The same data the student sees, the way the counselor needs it.",
  },
  {
    title: "Outcome reporting",
    body: "First-destination outcomes, salary ranges, employer concentration, time-to-offer. Auto-generated PDFs every semester for the dean, the provost, and the accreditation packet.",
  },
  {
    title: "Cohort matching",
    body: "When two students target the same company, when an alumni contact opens a path, when an interview format is shared — Tower surfaces the connection. Stronger cohorts than a static job board.",
  },
  {
    title: "Pilots from $1,500 / semester",
    body: "$1,500 – $2,500 per semester depending on cohort size. Pilots run one semester; after that we sit down with you to decide whether it earned a renewal. No multi-year contracts.",
  },
];

export default function CampusPage() {
  return (
    <div className="mx-auto max-w-5xl py-10 md:py-16">
      {/* Hero */}
      <header className="text-center md:text-left">
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(201, 168, 76, 0.85)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          For Universities
        </p>
        <h1
          className="mt-3 max-w-3xl"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Tower for Campus Career Centers.
        </h1>
        <p
          className="mt-5 max-w-2xl"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "18px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.6,
          }}
        >
          The same immersive command center your students would buy on their
          own — operated as a cohort experience, with counselor visibility,
          outcome reporting, and cohort matching baked in.
        </p>
      </header>

      {/* Pitch grid */}
      <section
        className="mt-16"
        aria-labelledby="campus-pitch"
      >
        <h2
          id="campus-pitch"
          className="sr-only"
        >
          What a campus pilot includes
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PITCH.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 rounded-xl border p-6"
              style={{
                background: "rgba(10, 12, 25, 0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "22px",
                  color: "#C9A84C",
                  lineHeight: 1.2,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.6,
                }}
              >
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Form */}
      <section
        className="mt-20"
        aria-labelledby="campus-form-heading"
      >
        <div className="mb-8 max-w-2xl">
          <h2
            id="campus-form-heading"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(28px, 4vw, 40px)",
              color: "var(--text-primary)",
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
            }}
          >
            Tell us about your program.
          </h2>
          <p
            className="mt-3"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "16px",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
            }}
          >
            We&rsquo;ll reply within two business days with a pilot proposal
            tailored to your cohort size and intake window.
          </p>
        </div>
        <div
          className="rounded-2xl border p-6 md:p-8"
          style={{
            background: "rgba(10, 12, 25, 0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <CampusInquiryForm />
        </div>
      </section>

      <footer className="mt-16 text-center">
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.12em",
          }}
        >
          Prefer to write us directly? {LEGAL_CONFIG.entity.supportEmail}
        </p>
      </footer>
    </div>
  );
}
