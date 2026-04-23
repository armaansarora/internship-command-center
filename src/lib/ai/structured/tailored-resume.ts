/**
 * Structured tailored-resume generation — the CMO's companion to the cover
 * letter. Takes the user's master resume text + a target job (company, role,
 * optional JD) and returns a re-framed resume that front-loads the most
 * relevant experience, skills, and projects for this specific opportunity.
 *
 * The output is a structured object so downstream UIs can render sections
 * discretely. The marshalled markdown feeds straight into documents.content
 * so the Writing Room viewer keeps working without changes.
 */
import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { getAgentModel, getActiveModelId } from "@/lib/ai/model";
import { getCachedSystem } from "@/lib/ai/prompt-cache";
import { recordAgentRun } from "@/lib/ai/telemetry";

export const TailoredResumeSchema = z.object({
  header_name: z
    .string()
    .min(1)
    .max(80)
    .describe(
      "Candidate's full name as it should appear at the top of the resume (preserve exactly from master resume; never fabricate)."
    ),
  header_contact: z
    .array(z.string().min(1).max(120))
    .max(5)
    .describe(
      "Contact lines — email, phone, LinkedIn, GitHub, city. Keep these exactly as they appear in the master resume."
    ),
  summary: z
    .string()
    .max(500)
    .describe(
      "Three-sentence targeted summary that connects the candidate to the specific role at the specific company. No boilerplate."
    ),
  experience: z
    .array(
      z.object({
        company: z.string().max(100),
        role: z.string().max(120),
        dates: z.string().max(80),
        location: z.string().max(80).optional(),
        bullets: z
          .array(z.string().min(8).max(320))
          .min(1)
          .max(6)
          .describe(
            "Rewritten bullets — quantified, action-first, aligned to this job's requirements. No fabrication: only re-frame facts present in the master resume."
          ),
      })
    )
    .max(6),
  projects: z
    .array(
      z.object({
        name: z.string().max(100),
        description: z.string().max(400),
      })
    )
    .max(4)
    .default([]),
  skills: z
    .array(z.string().max(80))
    .max(30)
    .describe(
      "Relevant skills in this exact order of relevance to the target role. Drop clearly-irrelevant ones from the master list."
    ),
  education: z
    .array(
      z.object({
        school: z.string().max(120),
        degree: z.string().max(120),
        dates: z.string().max(80).optional(),
        details: z.string().max(240).optional(),
      })
    )
    .max(4),
  tailoring_notes: z
    .string()
    .max(300)
    .describe(
      "One-sentence internal note on what was emphasized vs. de-emphasized. For the CMO's tone log — not rendered to the user."
    ),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

/**
 * Marshal a typed resume into the markdown body documents.content expects.
 */
export function renderTailoredResume(resume: TailoredResume): string {
  const lines: string[] = [];
  lines.push(`# ${resume.header_name}`);
  if (resume.header_contact.length > 0) {
    lines.push(resume.header_contact.join(" · "));
  }
  lines.push("");
  lines.push("## Summary");
  lines.push(resume.summary);
  lines.push("");
  lines.push("## Experience");
  for (const e of resume.experience) {
    lines.push(
      `**${e.role}** — ${e.company}${e.location ? ` · ${e.location}` : ""}${
        e.dates ? `  \n_${e.dates}_` : ""
      }`
    );
    for (const b of e.bullets) lines.push(`- ${b}`);
    lines.push("");
  }
  if (resume.projects.length > 0) {
    lines.push("## Projects");
    for (const p of resume.projects) {
      lines.push(`**${p.name}** — ${p.description}`);
    }
    lines.push("");
  }
  if (resume.skills.length > 0) {
    lines.push("## Skills");
    lines.push(resume.skills.join(" · "));
    lines.push("");
  }
  if (resume.education.length > 0) {
    lines.push("## Education");
    for (const ed of resume.education) {
      lines.push(
        `**${ed.degree}** — ${ed.school}${ed.dates ? `  \n_${ed.dates}_` : ""}`
      );
      if (ed.details) lines.push(ed.details);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push(`_Tailoring: ${resume.tailoring_notes}_`);
  return lines.join("\n");
}

interface GenerateInput {
  userId: string;
  companyName: string;
  role: string;
  masterResume: string;
  jobDescription?: string;
  /** Optional research blob (CIO) to deepen the framing. */
  companyResearch?: string;
  /** Optional CRO target-profile narrative to align emphasis. */
  targetNarrative?: string;
}

const SYSTEM_PROMPT = `You are the CMO of The Tower — a marketing-strategist character who tailors resumes. Your ONE rule that trumps all others: you may only re-frame content that already appears in the master resume. You MUST NOT invent roles, companies, numbers, skills, schools, or technologies. If a fact isn't in the master, it doesn't go in the tailored version.

What tailoring MEANS:
- Rewriting bullets to lead with the verbs this role cares about.
- Re-ordering experience so the most-relevant comes first.
- Re-ordering and pruning skills to match the job description's keywords — but only from skills the master actually lists.
- Tightening prose so every line earns its place.
- Adjusting the three-sentence summary to speak directly to THIS role at THIS company.

Hard-stops:
- No new employers. No new titles. No new technologies. No inflated metrics.
- Dates must match the master exactly.
- If the master is sparse, the tailored output is sparse — don't pad.

Output a structured resume with header_name + header_contact, summary, experience[], projects[], skills[], education[], and a one-sentence tailoring_notes log.`;

export async function generateStructuredTailoredResume(
  input: GenerateInput
): Promise<{ resume: TailoredResume; markdown: string } | null> {
  const start = Date.now();
  const modelId = getActiveModelId();

  const jobBlock = input.jobDescription
    ? `\n\nJOB DESCRIPTION (align bullets & skill order to these):\n${input.jobDescription.slice(0, 1800)}`
    : "";
  const researchBlock = input.companyResearch
    ? `\n\nCOMPANY CONTEXT (cite specifics if the master supports it):\n${input.companyResearch.slice(0, 1200)}`
    : "";
  const targetBlock = input.targetNarrative
    ? `\n\nCRO TARGET NOTES (what the user cares about overall):\n${input.targetNarrative.slice(0, 800)}`
    : "";

  const prompt = `Tailor this master resume for ${input.companyName} — ${input.role}.

MASTER RESUME (canonical truth — every tailored claim must be derivable from this):
${input.masterResume.slice(0, 6000)}${jobBlock}${researchBlock}${targetBlock}

Re-frame; do not invent. Return the structured resume object.`;

  try {
    const result = await generateText({
      model: getAgentModel(),
      system: getCachedSystem(SYSTEM_PROMPT),
      prompt,
      output: Output.object({ schema: TailoredResumeSchema }),
    });

    if (!result.output) return null;

    void recordAgentRun({
      userId: input.userId,
      agent: "cmo",
      action: "structured.tailored_resume",
      modelId,
      usage: result.usage,
      durationMs: Date.now() - start,
      inputSummary: `${input.companyName} / ${input.role}`,
      outputSummary: `Resume v1 — summary: ${result.output.summary.slice(0, 120)}`,
    });

    return {
      resume: result.output,
      markdown: renderTailoredResume(result.output),
    };
  } catch (err) {
    void recordAgentRun({
      userId: input.userId,
      agent: "cmo",
      action: "structured.tailored_resume",
      modelId,
      usage: undefined,
      durationMs: Date.now() - start,
      inputSummary: `${input.companyName} / ${input.role}`,
      outputSummary: null,
      error: err instanceof Error ? err.message : String(err),
      status: "failed",
    });
    return null;
  }
}
