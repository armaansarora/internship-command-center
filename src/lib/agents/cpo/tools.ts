import { tool } from "ai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Local Types
// ---------------------------------------------------------------------------

interface InterviewRow {
  id: string;
  application_id: string;
  company_id: string | null;
  round: string | null;
  format: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  interviewer_name: string | null;
  interviewer_title: string | null;
  status: string | null;
  prep_packet_id: string | null;
  notes: string | null;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  company_name: string | null;
  role: string;
}

interface CompanyRow {
  id: string;
  name: string;
  description: string | null;
  culture_summary: string | null;
  recent_news: string | null;
  financials_summary: string | null;
  internship_intel: string | null;
  industry: string | null;
  headquarters: string | null;
}

interface DocumentRow {
  id: string;
  application_id: string | null;
  company_id: string | null;
  type: string | null;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface InterviewForAgent {
  id: string;
  applicationId: string;
  companyId: string | null;
  companyName: string | null;
  role: string | null;
  round: string | null;
  format: string | null;
  scheduledAt: string | null;
  durationMinutes: number;
  location: string | null;
  interviewerName: string | null;
  interviewerTitle: string | null;
  status: string | null;
  hasPrepPacket: boolean;
  prepPacketId: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Tool 1: generatePrepPacket
// ---------------------------------------------------------------------------
export function makeGeneratePrepPacketTool(userId: string) {
  return tool({
    description:
      "Generate a comprehensive interview prep packet for a specific application. Includes company overview, likely questions by category (behavioral, technical, culture-fit), talking points, culture notes, and questions the candidate should ask. Stores the packet in the documents table and returns the content plus document ID.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe("UUID of the application this prep packet is for"),
      companyName: z.string().describe("Name of the company being interviewed at"),
      role: z.string().describe("Role title being interviewed for"),
      interviewFormat: z
        .enum(["phone_screen", "video", "on_site", "case", "technical", "behavioral", "general"])
        .default("general")
        .describe("Type of interview format to tailor the prep packet"),
      interviewRound: z
        .string()
        .optional()
        .describe("Interview round (e.g. 'Round 1', 'Final Round', 'Superday') if known"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      // Build the prep packet content
      const formatContext = input.interviewFormat !== "general"
        ? `\n**Interview Format:** ${input.interviewFormat.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
        : "";

      const roundContext = input.interviewRound
        ? `\n**Round:** ${input.interviewRound}`
        : "";

      const content = `# Interview Prep Packet — ${input.companyName}
**Role:** ${input.role}${formatContext}${roundContext}
**Generated:** ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

---

## 1. Company Overview
Research ${input.companyName}'s recent earnings, major acquisitions, strategic priorities, and competitive positioning. Know their business model cold. Key areas to cover:
- Core business lines and revenue drivers
- Recent news and strategic initiatives
- Competitive landscape (who they compete with and why they win)
- Culture and values (from their website, Glassdoor, LinkedIn)

---

## 2. Likely Questions — Behavioral (STAR Framework)

1. **Tell me about a time you led a project under tight deadlines.**
   *Framework: STAR — Situation, Task, Action, Result. Lead with the result.*

2. **Describe a situation where you had to analyze data to make a recommendation.**
   *Framework: STAR — emphasize your analytical process and how you communicated findings.*

3. **Give an example of when you worked with a difficult team member.**
   *Framework: STAR — focus on collaboration, communication, and outcome.*

4. **Tell me about a time you failed. What did you learn?**
   *Framework: STAR — own the failure, focus 70% of answer on the lesson and recovery.*

---

## 3. Likely Questions — Role-Specific / Technical

1. **Walk me through a DCF model.**
   *Direct answer — demonstrate fluency with assumptions, discount rate, terminal value.*

2. **What drives cap rates in the current market environment?**
   *Direct answer — interest rates, supply/demand, asset class risk premiums.*

3. **How would you evaluate a real estate acquisition opportunity?**
   *Structured response — market analysis, financial modeling, risk factors, exit strategy.*

4. **What trends are you watching in ${input.companyName}'s sector?**
   *Direct answer — cite 2-3 specific trends with data. Show you read the news.*

---

## 4. Likely Questions — Culture Fit

1. **Why ${input.companyName}?**
   *"Why this company" answer — be specific. Reference their recent deals, culture, or growth strategy.*

2. **Why this role over a competing offer?**
   *Connect your skills to the role requirements. Show alignment with their team's mission.*

3. **Where do you see yourself in 5 years?**
   *Align with a plausible career path at ${input.companyName}. Show ambition without overpromising.*

---

## 5. Your Talking Points
- Lead with your most relevant experience for this specific role
- Quantify everything: "increased by X%," "managed a $Y portfolio," "reduced time by Z hours"
- Connect your academic background to their real-world work
- Prepare one sharp insight about ${input.companyName}'s recent news or strategy

---

## 6. Questions to Ask Them (Pick 2-3)
1. "What does success look like for this intern in the first 90 days?"
2. "What's the most challenging deal or project the team has worked on recently?"
3. "How does this role contribute to the firm's broader strategy?"
4. "What do people who excel in this role have in common?"

---

## 7. Day-Of Reminders
- Review this packet the night before — don't cram morning of
- Have 2-3 STAR stories ready that can flex across multiple questions
- Arrive mentally fresh. Confidence > perfection.
- Have your questions ready. Not asking questions is a red flag.`;

      const { data: created, error } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          application_id: input.applicationId,
          type: "prep_packet",
          title: `Prep Packet — ${input.companyName} (${input.role})`,
          content,
          version: 1,
          is_active: true,
          generated_by: "cpo",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !created) {
        return {
          success: false,
          documentId: null,
          content: null,
          message: `Failed to store prep packet: ${error?.message ?? "unknown error"}`,
        };
      }

      return {
        success: true,
        documentId: (created as DocumentRow).id,
        content,
        companyName: input.companyName,
        role: input.role,
        message: `Prep packet for ${input.companyName} (${input.role}) created and saved to your Briefing Room.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: getUpcomingInterviews
// ---------------------------------------------------------------------------
export function makeGetUpcomingInterviewsTool(userId: string) {
  return tool({
    description:
      "Fetch all upcoming interviews from the interviews table, sorted by scheduled date ascending (soonest first). Shows which interviews have prep packets and which are unprepped. Call this to assess prep status across the pipeline.",
    inputSchema: z.object({
      daysAhead: z
        .number()
        .int()
        .min(1)
        .max(90)
        .default(30)
        .describe("How many days ahead to look for scheduled interviews"),
      includeCompleted: z
        .boolean()
        .default(false)
        .describe("Whether to include already-completed interviews"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      const now = new Date();
      const future = new Date(now.getTime() + input.daysAhead * 24 * 60 * 60 * 1000);

      let query = supabase
        .from("interviews")
        .select("*")
        .eq("user_id", userId)
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", future.toISOString())
        .order("scheduled_at", { ascending: true });

      if (!input.includeCompleted) {
        query = query.neq("status", "completed").neq("status", "cancelled");
      }

      const { data: interviewRows, error } = await query;

      if (error) {
        return {
          interviews: [],
          total: 0,
          prepped: 0,
          unprepped: 0,
          message: `Query failed: ${error.message}`,
        };
      }

      const rows = (interviewRows ?? []) as InterviewRow[];

      // Fetch application names for context
      const applicationIds = [...new Set(rows.map((r) => r.application_id))];
      const appMap: Record<string, ApplicationRow> = {};

      if (applicationIds.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, company_name, role")
          .eq("user_id", userId)
          .in("id", applicationIds);

        for (const app of (apps ?? []) as ApplicationRow[]) {
          appMap[app.id] = app;
        }
      }

      const interviews: InterviewForAgent[] = rows.map((row) => {
        const app = appMap[row.application_id];
        return {
          id: row.id,
          applicationId: row.application_id,
          companyId: row.company_id,
          companyName: app?.company_name ?? null,
          role: app?.role ?? null,
          round: row.round,
          format: row.format,
          scheduledAt: row.scheduled_at,
          durationMinutes: row.duration_minutes ?? 60,
          location: row.location,
          interviewerName: row.interviewer_name,
          interviewerTitle: row.interviewer_title,
          status: row.status,
          hasPrepPacket: row.prep_packet_id !== null,
          prepPacketId: row.prep_packet_id,
          notes: row.notes,
        };
      });

      const prepped = interviews.filter((i) => i.hasPrepPacket).length;
      const unprepped = interviews.filter((i) => !i.hasPrepPacket).length;

      return {
        interviews,
        total: interviews.length,
        prepped,
        unprepped,
        daysAhead: input.daysAhead,
        message:
          interviews.length === 0
            ? "No upcoming interviews found in that window."
            : `Found ${interviews.length} upcoming interview(s). ${prepped} prepped, ${unprepped} unprepped.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: getCompanyResearch
// ---------------------------------------------------------------------------
export function makeGetCompanyResearchTool(userId: string) {
  return tool({
    description:
      "Read company research data from the companies table for a specific company. Returns all research fields including description, culture summary, recent news, financials, and internship intel. Use this to feed company context into prep packet generation.",
    inputSchema: z.object({
      companyName: z
        .string()
        .describe("Name of the company to look up research for"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("companies")
        .select(
          "id, name, description, culture_summary, recent_news, financials_summary, internship_intel, industry, headquarters"
        )
        .eq("user_id", userId)
        .ilike("name", `%${input.companyName}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return {
          found: false,
          company: null,
          message: `No research found for "${input.companyName}". The CIO may not have researched this company yet, or the name may be spelled differently.`,
        };
      }

      const row = data as CompanyRow;

      return {
        found: true,
        company: {
          id: row.id,
          name: row.name,
          industry: row.industry,
          headquarters: row.headquarters,
          description: row.description,
          cultureSummary: row.culture_summary,
          recentNews: row.recent_news,
          financialsSummary: row.financials_summary,
          internshipIntel: row.internship_intel,
        },
        message: `Research found for ${row.name}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: getExistingPrepPackets
// ---------------------------------------------------------------------------
export function makeGetExistingPrepPacketsTool(userId: string) {
  return tool({
    description:
      "List all existing prep_packet documents for the user, including which application and company each is linked to. Use this to check what's already been prepped before generating a new packet.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe("Maximum number of prep packets to return"),
    }),
    execute: async (input) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("documents")
        .select("id, application_id, company_id, title, content, created_at, updated_at")
        .eq("user_id", userId)
        .eq("type", "prep_packet")
        .order("created_at", { ascending: false })
        .limit(input.limit);

      if (error) {
        return {
          prepPackets: [],
          total: 0,
          message: `Query failed: ${error.message}`,
        };
      }

      const rows = (data ?? []) as DocumentRow[];

      // Enrich with application details
      const applicationIds = rows
        .map((r) => r.application_id)
        .filter((id): id is string => id !== null);

      const appMap: Record<string, ApplicationRow> = {};

      if (applicationIds.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, company_name, role")
          .eq("user_id", userId)
          .in("id", applicationIds);

        for (const app of (apps ?? []) as ApplicationRow[]) {
          appMap[app.id] = app;
        }
      }

      const prepPackets = rows.map((row) => {
        const app = row.application_id ? appMap[row.application_id] : null;
        return {
          id: row.id,
          applicationId: row.application_id,
          companyId: row.company_id,
          companyName: app?.company_name ?? null,
          role: app?.role ?? null,
          title: row.title,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          // Omit full content to keep response lean
          contentPreview: row.content ? row.content.slice(0, 200) + "..." : null,
        };
      });

      return {
        prepPackets,
        total: prepPackets.length,
        message:
          prepPackets.length === 0
            ? "No prep packets on file yet."
            : `Found ${prepPackets.length} prep packet(s) on file.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: generateQuestions
// ---------------------------------------------------------------------------
export function makeGenerateQuestionsTool(userId: string) {
  return tool({
    description:
      "Generate targeted interview questions for a specific company, role, and interview type. Returns questions with suggested answer frameworks (STAR method, case structure, direct answer). Use this for focused question practice or to build out the questions section of a prep packet.",
    inputSchema: z.object({
      companyName: z.string().describe("Name of the company being interviewed at"),
      role: z.string().describe("Role title being interviewed for"),
      interviewType: z
        .enum(["behavioral", "technical", "case", "culture_fit", "mixed"])
        .describe(
          "Type of interview to generate questions for. Use 'mixed' for a balanced set across all types."
        ),
      count: z
        .number()
        .int()
        .min(3)
        .max(20)
        .default(8)
        .describe("Number of questions to generate"),
    }),
    execute: async (input) => {
      void userId;

      type Question = {
        id: number;
        category: string;
        question: string;
        framework: string;
        tip: string;
      };

      const behavioralQuestions: Question[] = [
        {
          id: 1,
          category: "behavioral",
          question: "Tell me about a time you had to analyze complex data to make a business recommendation.",
          framework: "STAR — Emphasize your analytical process, the data sources you used, and how you communicated findings to stakeholders.",
          tip: "Lead with the result, then walk back through your process.",
        },
        {
          id: 2,
          category: "behavioral",
          question: "Describe a situation where you had to work with a difficult team member to deliver a project.",
          framework: "STAR — Focus on your communication approach, the specific actions you took, and the outcome for the project.",
          tip: "Never criticize the other person. Focus on your behavior and the resolution.",
        },
        {
          id: 3,
          category: "behavioral",
          question: "Tell me about a time you took initiative on a project beyond what was expected of you.",
          framework: "STAR — Show ownership and proactivity. Quantify the impact where possible.",
          tip: "Pick an example where your initiative created measurable value.",
        },
        {
          id: 4,
          category: "behavioral",
          question: `Give me an example of a time you had to quickly learn something new to complete a task.`,
          framework: "STAR — Demonstrate learning agility. Show the specific steps you took to get up to speed.",
          tip: "This is really a question about intellectual curiosity and adaptability.",
        },
        {
          id: 5,
          category: "behavioral",
          question: "Tell me about a time you failed to meet a goal or expectation. What did you learn?",
          framework: "STAR — Own the failure fully. Spend 70% of the answer on what you learned and how you changed.",
          tip: "Do not pick a 'humble brag' failure. Pick something real.",
        },
      ];

      const technicalQuestions: Question[] = [
        {
          id: 6,
          category: "technical",
          question: `Walk me through how you would evaluate a ${input.role.toLowerCase().includes("real estate") ? "real estate acquisition" : "potential investment"} opportunity from initial screening to final recommendation.`,
          framework: "Structured response — Market analysis → Financial modeling → Risk factors → Exit strategy → Final recommendation.",
          tip: `Demonstrate familiarity with ${input.companyName}'s asset class and deal structure.`,
        },
        {
          id: 7,
          category: "technical",
          question: "What are the key drivers of valuation in your target sector right now?",
          framework: "Direct answer — Cite 3-4 specific macro and micro drivers with current market data.",
          tip: "Reference something from the news in the last 30 days. Shows you're plugged in.",
        },
        {
          id: 8,
          category: "technical",
          question: "Walk me through a DCF model. What assumptions are you most sensitive to?",
          framework: "Direct answer — Revenue growth, margins, discount rate (WACC), terminal growth rate. Explain sensitivity analysis.",
          tip: `Connect to ${input.companyName}'s specific asset class — cap rates, NOI, or revenue multiples as relevant.`,
        },
        {
          id: 9,
          category: "technical",
          question: "How would you assess the risk profile of a deal in the current macro environment?",
          framework: "Structured response — Interest rate risk, liquidity risk, operational risk, exit risk. Tie to current market conditions.",
          tip: "Mention current Fed policy and credit market conditions to show macro awareness.",
        },
      ];

      const caseQuestions: Question[] = [
        {
          id: 10,
          category: "case",
          question: `${input.companyName} is evaluating entering a new market segment. How would you structure the analysis?`,
          framework: "Case structure — Market size → Competitive dynamics → ${input.companyName}'s capabilities → Financial viability → Recommendation.",
          tip: "State your structure before diving in. Ask clarifying questions if needed.",
        },
        {
          id: 11,
          category: "case",
          question: `Your team's deal pipeline is down 30% from last quarter. What would you investigate first?`,
          framework: "Case structure — Diagnose root cause (market conditions, team capacity, sourcing channels, deal quality) before recommending solutions.",
          tip: "Drive to a hypothesis quickly. Show structured thinking under pressure.",
        },
      ];

      const cultureFitQuestions: Question[] = [
        {
          id: 12,
          category: "culture_fit",
          question: `Why ${input.companyName}? Specifically — what drew you to us over competitors?`,
          framework: "Direct answer — Be specific. Reference their recent deals, culture differentiators, or growth strategy. Generic answers fail here.",
          tip: `Research ${input.companyName}'s last 3 major deals and reference one of them.`,
        },
        {
          id: 13,
          category: "culture_fit",
          question: `Why this ${input.role} role? Why now in your career?`,
          framework: "Direct answer — Connect your background to the role's requirements. Show a clear through-line.",
          tip: "Articulate what you're moving toward, not what you're moving away from.",
        },
        {
          id: 14,
          category: "culture_fit",
          question: "What are you looking for in a team and a manager?",
          framework: "Direct answer — Be honest but frame it positively. Research ${input.companyName}'s culture before answering.",
          tip: "Avoid saying 'I just want to learn.' Show you know what good management looks like.",
        },
        {
          id: 15,
          category: "culture_fit",
          question: "Where do you see yourself in 5 years?",
          framework: "Direct answer — Align with a credible career path within ${input.companyName}'s structure. Show ambition without overcommitting.",
          tip: `Map your answer to how internships at ${input.companyName} typically progress to full-time roles.`,
        },
      ];

      let selectedQuestions: Question[] = [];

      const numQuestions = input.count;

      switch (input.interviewType) {
        case "behavioral":
          selectedQuestions = behavioralQuestions.slice(0, numQuestions);
          break;
        case "technical":
          selectedQuestions = technicalQuestions.slice(0, numQuestions);
          break;
        case "case":
          selectedQuestions = caseQuestions.slice(0, numQuestions);
          break;
        case "culture_fit":
          selectedQuestions = cultureFitQuestions.slice(0, numQuestions);
          break;
        case "mixed": {
          // Balanced distribution across all types
          const perType = Math.ceil(numQuestions / 4);
          selectedQuestions = [
            ...behavioralQuestions.slice(0, perType),
            ...technicalQuestions.slice(0, perType),
            ...caseQuestions.slice(0, Math.min(perType, caseQuestions.length)),
            ...cultureFitQuestions.slice(0, perType),
          ].slice(0, numQuestions);
          break;
        }
      }

      const categoryCounts: Record<string, number> = {};
      for (const q of selectedQuestions) {
        categoryCounts[q.category] = (categoryCounts[q.category] ?? 0) + 1;
      }

      return {
        companyName: input.companyName,
        role: input.role,
        interviewType: input.interviewType,
        questions: selectedQuestions,
        totalGenerated: selectedQuestions.length,
        categoryCounts,
        message: `Generated ${selectedQuestions.length} ${input.interviewType} question(s) for ${input.companyName} — ${input.role}. Each includes a framework and coaching tip.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCPOTools(userId: string) {
  return {
    generatePrepPacket: makeGeneratePrepPacketTool(userId),
    getUpcomingInterviews: makeGetUpcomingInterviewsTool(userId),
    getCompanyResearch: makeGetCompanyResearchTool(userId),
    getExistingPrepPackets: makeGetExistingPrepPacketsTool(userId),
    generateQuestions: makeGenerateQuestionsTool(userId),
  };
}
