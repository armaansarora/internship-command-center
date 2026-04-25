import type { JSX } from "react";

interface LegalSection {
  heading: string;
  body: readonly string[];
}

interface LegalDocumentProps {
  title: string;
  revisedOn: string;
  sections: readonly LegalSection[];
}

/**
 * Shared renderer for /terms and /privacy. Matches the Tower's serif-display
 * + mono-data type system. Long-form readable column, no glass cards (legal
 * copy benefits from looking like a document, not a feature).
 */
export function LegalDocument({
  title,
  revisedOn,
  sections,
}: LegalDocumentProps): JSX.Element {
  return (
    <article className="mx-auto max-w-3xl py-12 md:py-16">
      <header className="mb-12">
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(40px, 6vw, 56px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        <p
          className="mt-3"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Last revised {revisedOn}
        </p>
      </header>
      {sections.map((section, idx) => (
        <section key={section.heading} className={idx === 0 ? "" : "mt-10"}>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "22px",
              fontWeight: 600,
              color: "#C9A84C",
              lineHeight: 1.3,
              marginBottom: "12px",
            }}
          >
            {section.heading}
          </h2>
          <div className="flex flex-col gap-4">
            {section.body.map((paragraph, pIdx) => (
              <p
                key={pIdx}
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.78)",
                  lineHeight: 1.65,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
