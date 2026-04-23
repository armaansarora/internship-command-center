import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TailoredResumeSchema,
  renderTailoredResume,
} from "./tailored-resume";

describe("tailored-resume schema + renderer", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });

  const full = TailoredResumeSchema.parse({
    header_name: "Jane Doe",
    header_contact: ["jane@example.com", "linkedin.com/in/jane", "New York"],
    summary:
      "Software engineer with two years of production experience on payments infrastructure. Built high-throughput Ruby services at a Series C fintech. Targeting Stripe's Payments Infra team.",
    experience: [
      {
        company: "FintechCo",
        role: "Software Engineer",
        dates: "2024 - present",
        bullets: [
          "Owned the ledger-consistency service handling 30M transactions per day.",
          "Led the migration from Postgres replica to read-through cache.",
        ],
      },
    ],
    projects: [
      {
        name: "Open-source ledger simulator",
        description: "A double-entry accounting simulator used in three courses.",
      },
    ],
    skills: ["Ruby", "Postgres", "Redis", "Go"],
    education: [
      {
        school: "NYU",
        degree: "B.S. Computer Science",
        dates: "2020 - 2024",
      },
    ],
    tailoring_notes:
      "Led with payment-infra language and pulled Redis/Postgres specifics to the top of skills.",
  });

  it("schema parses a canonical structured resume", () => {
    expect(full.header_name).toBe("Jane Doe");
    expect(full.experience[0].bullets.length).toBe(2);
  });

  it("schema enforces experience bullets are non-empty", () => {
    expect(() =>
      TailoredResumeSchema.parse({
        ...full,
        experience: [
          {
            company: "X",
            role: "Y",
            dates: "2024",
            bullets: [],
          },
        ],
      })
    ).toThrow();
  });

  it("schema enforces header_name presence", () => {
    expect(() =>
      TailoredResumeSchema.parse({ ...full, header_name: "" })
    ).toThrow();
  });

  it("schema caps skills at 30 entries", () => {
    const tooMany = Array.from({ length: 31 }, (_, i) => `skill-${i}`);
    expect(() =>
      TailoredResumeSchema.parse({ ...full, skills: tooMany })
    ).toThrow();
  });

  it("renderer produces stable markdown with the key sections", () => {
    const md = renderTailoredResume(full);
    expect(md.startsWith("# Jane Doe")).toBe(true);
    expect(md).toContain("jane@example.com · linkedin.com/in/jane · New York");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Experience");
    expect(md).toContain("**Software Engineer** — FintechCo");
    expect(md).toContain(
      "- Owned the ledger-consistency service handling 30M transactions per day."
    );
    expect(md).toContain("## Projects");
    expect(md).toContain("## Skills");
    expect(md).toContain("Ruby · Postgres · Redis · Go");
    expect(md).toContain("## Education");
    expect(md).toContain("B.S. Computer Science");
    expect(md).toContain("_Tailoring: ");
  });

  it("renderer omits optional sections cleanly when empty", () => {
    const lean = TailoredResumeSchema.parse({
      header_name: "Alex Park",
      header_contact: [],
      summary: "Short summary.",
      experience: [
        {
          company: "Co",
          role: "Role",
          dates: "2024",
          bullets: ["A well-formed bullet of sufficient length to pass."],
        },
      ],
      skills: [],
      education: [],
      tailoring_notes: "n/a",
    });
    const md = renderTailoredResume(lean);
    expect(md).toContain("## Experience");
    expect(md).not.toContain("## Projects");
    expect(md).not.toContain("## Skills");
    expect(md).not.toContain("## Education");
  });
});
