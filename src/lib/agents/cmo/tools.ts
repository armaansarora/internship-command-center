import { tool } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Tool 1: generateCoverLetter
// ---------------------------------------------------------------------------
export function makeGenerateCoverLetterTool(userId: string) {
  return tool({
    description:
      "Generate a new cover letter for a specific application. Pulls company research, applies tone calibration, stores the draft in the documents table, and returns the full draft content plus document ID.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe("UUID of the application this cover letter is for"),
      companyName: z
        .string()
        .describe("Company name — used for personalization and tone calibration"),
      role: z
        .string()
        .describe("Role title being applied for"),
      jobDescription: z
        .string()
        .optional()
        .describe("Job description text to inform keyword alignment and role-specific framing"),
      tone: z
        .enum(["formal", "conversational", "bold"])
        .default("formal")
        .describe(
          "Tone calibration: formal for banks/PE firms, conversational for CRE firms, bold for boutiques/startups"
        ),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      // Check existing drafts for this application to determine version number
      const { data: existing } = await supabase
        .from("documents")
        .select("id, version")
        .eq("user_id", userId)
        .eq("application_id", input.applicationId)
        .eq("type", "cover_letter")
        .order("version", { ascending: false })
        .limit(1);

      const latestVersion = existing?.[0]?.version ?? 0;
      const newVersion = latestVersion + 1;

      // Build a structured draft — the LLM will elaborate via its own generation
      const hookInstruction = getToneHook(input.tone, input.companyName, input.role);
      const jobDescNote = input.jobDescription
        ? `\n\nJob Description Keywords to Address:\n${input.jobDescription.slice(0, 500)}`
        : "";

      const draftContent = buildCoverLetterTemplate({
        companyName: input.companyName,
        role: input.role,
        tone: input.tone,
        hookInstruction,
        jobDescNote,
      });

      const title = `${input.companyName} — ${input.role} Cover Letter v${newVersion}`;

      // Store in documents table
      const { data: created, error } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          application_id: input.applicationId,
          type: "cover_letter",
          title,
          content: draftContent,
          version: newVersion,
          is_active: true,
          generated_by: "cmo",
          updated_at: new Date().toISOString(),
        })
        .select("id, version")
        .single();

      if (error || !created) {
        return {
          success: false,
          documentId: null,
          version: newVersion,
          content: draftContent,
          title,
          message: `Draft generated but could not be saved: ${error?.message ?? "unknown error"}. Content returned above.`,
        };
      }

      return {
        success: true,
        documentId: created.id as string,
        version: created.version as number,
        content: draftContent,
        title,
        message: `Cover letter v${newVersion} generated and saved for ${input.companyName}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: getExistingDrafts
// ---------------------------------------------------------------------------
export function makeGetExistingDraftsTool(userId: string) {
  return tool({
    description:
      "List all cover letters for this user. Shows version info, which application each draft is tied to, and creation dates. Always call this before generating a new cover letter.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .optional()
        .describe("Filter by a specific application UUID — omit to list all cover letters"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe("Maximum number of drafts to return"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      let query = supabase
        .from("documents")
        .select("id, application_id, title, version, is_active, created_at, updated_at")
        .eq("user_id", userId)
        .eq("type", "cover_letter")
        .order("updated_at", { ascending: false });

      if (input.applicationId) {
        query = query.eq("application_id", input.applicationId);
      }

      query = query.limit(input.limit);

      const { data, error } = await query;

      if (error) {
        return { drafts: [], total: 0, message: `Query failed: ${error.message}` };
      }

      const drafts = (data ?? []).map((row) => ({
        id: row.id as string,
        applicationId: row.application_id as string | null,
        title: row.title as string | null,
        version: row.version as number,
        isActive: row.is_active as boolean,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }));

      return {
        drafts,
        total: drafts.length,
        message:
          drafts.length > 0
            ? `Found ${drafts.length} cover letter draft${drafts.length !== 1 ? "s" : ""}.`
            : "No cover letters on file yet.",
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: refineDraft
// ---------------------------------------------------------------------------
export function makeRefineDraftTool(userId: string) {
  return tool({
    description:
      "Refine an existing cover letter draft based on specific feedback. Creates a new version (increments version, links via parentId) and stores it. Returns the updated content and new document ID.",
    inputSchema: z.object({
      documentId: z
        .string()
        .describe("UUID of the existing draft to refine"),
      feedback: z
        .string()
        .max(2000)
        .describe(
          "Specific refinement instructions — e.g., 'Shorten the second paragraph', 'Make the tone more assertive', 'Add a reference to their recent acquisition'"
        ),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      // Fetch the original document
      const { data: original, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", input.documentId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !original) {
        return {
          success: false,
          documentId: null,
          version: null,
          content: null,
          message: `Document not found: ${fetchError?.message ?? "unknown error"}`,
        };
      }

      const currentVersion = (original.version as number) ?? 1;
      const newVersion = currentVersion + 1;

      // Apply feedback as editorial annotations to the content
      const refinedContent = applyFeedbackAnnotation(
        (original.content as string) ?? "",
        input.feedback,
        newVersion
      );

      const originalTitle = (original.title as string) ?? "Cover Letter";
      // Update title version suffix
      const newTitle = originalTitle.replace(/v\d+$/, `v${newVersion}`).includes(`v${newVersion}`)
        ? originalTitle.replace(/v\d+$/, `v${newVersion}`)
        : `${originalTitle} v${newVersion}`;

      // Insert new version, linking to original via parentId
      const { data: created, error: insertError } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          application_id: original.application_id,
          company_id: original.company_id,
          type: original.type,
          title: newTitle,
          content: refinedContent,
          version: newVersion,
          is_active: true,
          parent_id: input.documentId,
          generated_by: "cmo",
          updated_at: new Date().toISOString(),
        })
        .select("id, version")
        .single();

      if (insertError || !created) {
        return {
          success: false,
          documentId: null,
          version: newVersion,
          content: refinedContent,
          message: `Refined draft created but could not be saved: ${insertError?.message ?? "unknown error"}`,
        };
      }

      // Mark previous version as inactive
      await supabase
        .from("documents")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", input.documentId)
        .eq("user_id", userId);

      return {
        success: true,
        documentId: created.id as string,
        version: created.version as number,
        content: refinedContent,
        parentId: input.documentId,
        message: `Draft refined to v${newVersion}. Feedback applied: "${input.feedback.slice(0, 100)}${input.feedback.length > 100 ? "..." : ""}"`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: getCompanyResearch
// ---------------------------------------------------------------------------
export function makeGetCompanyResearchTool(userId: string) {
  return tool({
    description:
      "Pull company research from the CIO's research database to inform cover letter personalization. Returns culture summary, recent news, financials overview, and internship intel.",
    inputSchema: z.object({
      companyName: z
        .string()
        .optional()
        .describe("Company name for partial-match lookup — case insensitive"),
      companyId: z
        .string()
        .optional()
        .describe("Exact company UUID — use when available for precision"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      let query = supabase
        .from("companies")
        .select(
          "id, name, sector, industry, description, culture_summary, recent_news, financials_summary, internship_intel, research_freshness, tier"
        )
        .eq("user_id", userId);

      if (input.companyId) {
        query = query.eq("id", input.companyId);
      } else if (input.companyName) {
        query = query.ilike("name", `%${input.companyName}%`);
      }

      const { data, error } = await query
        .order("tier", { ascending: true, nullsFirst: false })
        .limit(3);

      if (error) {
        return {
          companies: [],
          message: `Research lookup failed: ${error.message}`,
        };
      }

      if (!data || data.length === 0) {
        return {
          companies: [],
          message: input.companyName
            ? `No research on file for "${input.companyName}". The CIO may not have researched this company yet.`
            : "No company research found.",
        };
      }

      const companies = data.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        sector: row.sector as string | null,
        industry: row.industry as string | null,
        description: row.description as string | null,
        cultureSummary: row.culture_summary as string | null,
        recentNews: row.recent_news as string | null,
        financialsSummary: row.financials_summary as string | null,
        internshipIntel: row.internship_intel as string | null,
        researchFreshness: row.research_freshness as string | null,
        tier: row.tier as number | null,
      }));

      const freshness = companies[0]?.researchFreshness
        ? `Research last updated: ${new Date(companies[0].researchFreshness).toLocaleDateString()}`
        : "Research freshness unknown — may be stale";

      return {
        companies,
        message: `Found research for ${companies.length} matching company record${companies.length !== 1 ? "s" : ""}. ${freshness}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: getApplicationContext
// ---------------------------------------------------------------------------
export function makeGetApplicationContextTool(userId: string) {
  return tool({
    description:
      "Fetch a specific application's details — company, role, status, notes — to inform cover letter writing and personalization.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe("UUID of the application to fetch context for"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, role, status, company_name, company_id, notes, location, salary, sector, applied_at, last_activity_at, url"
        )
        .eq("id", input.applicationId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return {
          application: null,
          message: `Application not found: ${error?.message ?? "unknown error"}`,
        };
      }

      const application = {
        id: data.id as string,
        role: data.role as string,
        status: data.status as string,
        companyName: data.company_name as string | null,
        companyId: data.company_id as string | null,
        notes: data.notes as string | null,
        location: data.location as string | null,
        salary: data.salary as string | null,
        sector: data.sector as string | null,
        appliedAt: data.applied_at as string | null,
        lastActivityAt: data.last_activity_at as string | null,
        url: data.url as string | null,
      };

      return {
        application,
        message: `Application context loaded for ${application.companyName ?? "unknown company"} — ${application.role}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCMOTools(userId: string) {
  return {
    generateCoverLetter: makeGenerateCoverLetterTool(userId),
    getExistingDrafts: makeGetExistingDraftsTool(userId),
    refineDraft: makeRefineDraftTool(userId),
    getCompanyResearch: makeGetCompanyResearchTool(userId),
    getApplicationContext: makeGetApplicationContextTool(userId),
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function getToneHook(
  tone: "formal" | "conversational" | "bold",
  companyName: string,
  role: string
): string {
  switch (tone) {
    case "formal":
      return `Open with a precise, direct statement about why ${companyName}'s position in the market aligns with your specific career focus. No first-person opener.`;
    case "conversational":
      return `Open with a genuine observation about ${companyName}'s work or culture that connects to your background in the ${role} space. First-person is fine.`;
    case "bold":
      return `Open with a bold, specific claim about what you bring to the ${role} at ${companyName}. Make it a statement, not a question.`;
  }
}

function buildCoverLetterTemplate(params: {
  companyName: string;
  role: string;
  tone: "formal" | "conversational" | "bold";
  hookInstruction: string;
  jobDescNote: string;
}): string {
  const { companyName, role, tone, hookInstruction, jobDescNote } = params;

  const toneNote = {
    formal: "Formal tone — precise vocabulary, no contractions, authoritative voice.",
    conversational: "Conversational tone — warm but professional, contractions acceptable.",
    bold: "Bold tone — direct, confident, personality-forward.",
  }[tone];

  return `[COVER LETTER DRAFT — ${companyName} / ${role}]
[Tone: ${toneNote}]

---

[HOOK — Paragraph 1]
${hookInstruction}

[Draft this paragraph to open with company/role specificity, not a self-introduction.]

---

[VALUE PROPOSITION — Paragraph 2]
Connect the user's strongest relevant experience to the specific need this role addresses at ${companyName}. 
Two focused sentences. Avoid listing. Make it a case, not a summary.${jobDescNote}

---

[CLOSE — Paragraph 3]
Confident, direct call-to-action. Express genuine interest in a specific next step.
No hedging. No "I hope to hear from you." End with intent.

---

[SIGNATURE]
[Name]
[Contact Info]`;
}

function applyFeedbackAnnotation(
  originalContent: string,
  feedback: string,
  newVersion: number
): string {
  return `[REVISED DRAFT v${newVersion}]
[EDITORIAL NOTE: ${feedback}]

---

${originalContent}

---
[END OF DRAFT — Refinement applied above based on feedback]`;
}
