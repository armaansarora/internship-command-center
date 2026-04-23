/**
 * North Star macro — runs the full Floor 7 proof-of-concept loop for a single
 * application. Fire-and-forget at the user level; the CEO or CRO just says
 * "run the North Star for X" and this function does:
 *
 *   1. Generate a tailored resume (CMO structured pipeline).
 *   2. Generate a cover letter (CMO structured pipeline).
 *   3. Write both to `documents`.
 *   4. Enqueue a cold_email row in `outreach_queue` (pending_approval) using
 *      the cover-letter body as the email body.
 *   5. Store a CRO "pattern" memory so the whiteboard reflects the run.
 *
 * Deterministic orchestration: this function calls the *structured generators*
 * directly rather than nesting generateText calls. That keeps model cost
 * bounded (exactly two LLM round-trips — resume + letter) and lets callers
 * skip the cover-letter step when a recipient email isn't available.
 *
 * Parallelism is deferred to R3 — R1 ships the proof loop serially.
 */
import { createClient } from "@/lib/supabase/server";
import { generateStructuredCoverLetter } from "@/lib/ai/structured/cover-letter";
import {
  generateStructuredTailoredResume,
  type TailoredResume,
} from "@/lib/ai/structured/tailored-resume";
import { storeAgentMemory } from "@/lib/db/queries/agent-memory-rest";
import { log } from "@/lib/logger";

export interface NorthStarInput {
  applicationId: string;
  /** Master resume content (required). */
  masterResume: string;
  /** Optional explicit tone for the cover letter. */
  tone?: "formal" | "conversational" | "bold";
  /** Optional override for the job description (else read from application.notes). */
  jobDescription?: string;
  /** Optional override for the cover-letter recipient email (else resolved from the application's contact, if any). */
  recipientEmail?: string;
  /** Optional override for the recipient display name used in the outreach subject/body greeting. */
  recipientName?: string;
}

export interface NorthStarStepResult {
  step: "resume" | "coverLetter" | "outreachDraft" | "memory";
  ok: boolean;
  detail: string;
  documentId?: string | null;
  outreachId?: string | null;
}

export interface NorthStarResult {
  ok: boolean;
  applicationId: string;
  companyName: string | null;
  role: string;
  steps: NorthStarStepResult[];
  resumeDocumentId: string | null;
  coverLetterDocumentId: string | null;
  outreachQueueId: string | null;
}

export async function executeNorthStar(
  userId: string,
  input: NorthStarInput
): Promise<NorthStarResult> {
  const supabase = await createClient();
  const steps: NorthStarStepResult[] = [];

  // 0) Load application context — IDOR-safe via user_id filter.
  const { data: appRow, error: appErr } = await supabase
    .from("applications")
    .select("id, role, company_name, notes, contact_id")
    .eq("user_id", userId)
    .eq("id", input.applicationId)
    .maybeSingle();

  if (appErr || !appRow) {
    return {
      ok: false,
      applicationId: input.applicationId,
      companyName: null,
      role: "",
      resumeDocumentId: null,
      coverLetterDocumentId: null,
      outreachQueueId: null,
      steps: [
        {
          step: "resume",
          ok: false,
          detail: `Application not found for this user: ${
            appErr?.message ?? "unknown"
          }`,
        },
      ],
    };
  }

  const companyName =
    (appRow.company_name as string | null) ?? "Unnamed company";
  const role = (appRow.role as string) ?? "Unknown role";
  const jobDescription =
    input.jobDescription ??
    ((appRow.notes as string | null) ?? "").slice(0, 8_000);

  // 1) Tailored resume.
  const tailored = await generateStructuredTailoredResume({
    userId,
    companyName,
    role,
    masterResume: input.masterResume,
    jobDescription,
  });

  let resumeDocumentId: string | null = null;
  if (!tailored) {
    steps.push({
      step: "resume",
      ok: false,
      detail: "Tailored resume generation failed.",
    });
  } else {
    const { data: resumeRow, error: resumeErr } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        application_id: input.applicationId,
        type: "resume_tailored",
        title: `${companyName} — ${role} Resume`,
        content: tailored.markdown,
        version: 1,
        is_active: true,
        generated_by: "cmo",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (resumeErr || !resumeRow) {
      steps.push({
        step: "resume",
        ok: false,
        detail: `Resume save failed: ${
          resumeErr?.message ?? "unknown"
        }`,
      });
    } else {
      resumeDocumentId = resumeRow.id as string;
      steps.push({
        step: "resume",
        ok: true,
        documentId: resumeDocumentId,
        detail: "Resume tailored and saved.",
      });
    }
  }

  // 2) Cover letter.
  const coverLetter = await generateStructuredCoverLetter({
    userId,
    companyName,
    role,
    tone: input.tone ?? "formal",
    jobDescription,
  });

  let coverLetterDocumentId: string | null = null;
  let coverLetterBody: string | null = null;
  if (!coverLetter) {
    steps.push({
      step: "coverLetter",
      ok: false,
      detail: "Cover letter generation failed.",
    });
  } else {
    coverLetterBody = coverLetter.markdown;
    const { data: letterRow, error: letterErr } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        application_id: input.applicationId,
        type: "cover_letter",
        title: `${companyName} — ${role} Cover Letter`,
        content: coverLetter.markdown,
        version: 1,
        is_active: true,
        generated_by: "cmo",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (letterErr || !letterRow) {
      steps.push({
        step: "coverLetter",
        ok: false,
        detail: `Cover letter save failed: ${
          letterErr?.message ?? "unknown"
        }`,
      });
    } else {
      coverLetterDocumentId = letterRow.id as string;
      steps.push({
        step: "coverLetter",
        ok: true,
        documentId: coverLetterDocumentId,
        detail: "Cover letter drafted and saved.",
      });
    }
  }

  // 3) Outreach draft — only when we have a body. Leave recipient empty if
  // none resolved; the user can edit before approving.
  let outreachQueueId: string | null = null;
  if (coverLetterBody) {
    const contactId =
      (appRow.contact_id as string | null) ?? null;

    const subject = `Interest in ${role} at ${companyName}`;
    const { data: outreachRow, error: outreachErr } = await supabase
      .from("outreach_queue")
      .insert({
        user_id: userId,
        application_id: input.applicationId,
        contact_id: contactId,
        type: "cold_email",
        subject,
        body: coverLetterBody,
        status: "pending_approval",
        generated_by: "ceo-north-star",
      })
      .select("id")
      .single();
    if (outreachErr || !outreachRow) {
      steps.push({
        step: "outreachDraft",
        ok: false,
        detail: `Outreach enqueue failed: ${
          outreachErr?.message ?? "unknown"
        }`,
      });
    } else {
      outreachQueueId = outreachRow.id as string;
      steps.push({
        step: "outreachDraft",
        ok: true,
        outreachId: outreachQueueId,
        detail: "Outreach queued for user approval.",
      });
    }
  } else {
    steps.push({
      step: "outreachDraft",
      ok: false,
      detail: "Skipped — no cover letter body to enqueue.",
    });
  }

  // 4) Whiteboard memory — pattern category so CROWhiteboard surfaces it.
  const memoryContent = buildMemoryNote(
    companyName,
    role,
    resumeDocumentId !== null,
    coverLetterDocumentId !== null,
    outreachQueueId !== null
  );
  try {
    await storeAgentMemory({
      userId,
      agent: "cro",
      category: "pattern",
      content: memoryContent,
      importance: 0.8,
    });
    steps.push({
      step: "memory",
      ok: true,
      detail: "CRO whiteboard note recorded.",
    });
  } catch (err) {
    log.warn("north_star.memory_store_failed", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    steps.push({
      step: "memory",
      ok: false,
      detail: `Memory store failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }

  const ok = steps.every((s) => s.ok);

  return {
    ok,
    applicationId: input.applicationId,
    companyName,
    role,
    resumeDocumentId,
    coverLetterDocumentId,
    outreachQueueId,
    steps,
  };
}

function buildMemoryNote(
  company: string,
  role: string,
  hasResume: boolean,
  hasLetter: boolean,
  hasOutreach: boolean
): string {
  const parts = [`North Star run: ${role} @ ${company}.`];
  const outputs: string[] = [];
  if (hasResume) outputs.push("resume tailored");
  if (hasLetter) outputs.push("cover drafted");
  if (hasOutreach) outputs.push("outreach queued");
  parts.push(
    outputs.length > 0
      ? outputs.join(", ") + "."
      : "generation failed — retry before approving."
  );
  return parts.join(" ");
}

// Lightweight stable type helper for tests.
export type { TailoredResume };
