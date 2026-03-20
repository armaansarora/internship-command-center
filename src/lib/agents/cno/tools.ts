import { tool } from "ai";
import { z } from "zod/v4";
import {
  getContactsForAgent,
  createContactRest,
  updateContactActivity,
  getContactStats,
  getColdContacts,
  getCoolingContacts,
} from "@/lib/db/queries/contacts-rest";

// ---------------------------------------------------------------------------
// Tool 1: queryContacts
// ---------------------------------------------------------------------------
export function makeQueryContactsTool(userId: string) {
  return tool({
    description:
      "Filter contacts by warmth level, company, or relationship type. Always call this before making claims about the user's network.",
    inputSchema: z.object({
      warmth: z
        .enum(["warm", "cooling", "cold"])
        .optional()
        .describe(
          "Filter by warmth level: warm (0–7 days), cooling (7–14 days), cold (14+ days)"
        ),
      company: z
        .string()
        .optional()
        .describe("Filter by company name (partial match)"),
      relationshipType: z
        .string()
        .optional()
        .describe(
          "Filter by relationship type (e.g. recruiter, alumni, hiring_manager, referral)"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Maximum number of contacts to return"),
      sortBy: z
        .enum(["coldness_desc", "name_asc", "recent_desc"])
        .default("coldness_desc")
        .describe(
          "Sort order: coldness_desc (coldest first), name_asc (alphabetical), recent_desc (most recently contacted first)"
        ),
    }),
    execute: async (input) => {
      return getContactsForAgent(userId, {
        warmth: input.warmth,
        relationship: input.relationshipType,
        limit: input.limit,
        sortBy: input.sortBy,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: addContact
// ---------------------------------------------------------------------------
export function makeAddContactTool(userId: string) {
  return tool({
    description:
      "Create a new contact in the user's network, optionally linked to a company or application.",
    inputSchema: z.object({
      name: z.string().min(1).max(200).describe("Full name of the contact"),
      email: z
        .string()
        .optional()
        .describe("Email address of the contact"),
      title: z
        .string()
        .optional()
        .describe("Job title or role at their company"),
      companyId: z
        .string()
        .optional()
        .describe(
          "UUID of the company record to link to. Use researchCompany or getCompanyList to find the ID first."
        ),
      relationship: z
        .enum(["alumni", "recruiter", "referral", "cold", "warm_intro"])
        .optional()
        .describe(
          "How you know them: alumni, recruiter, referral, cold, warm_intro"
        ),
      linkedinUrl: z
        .string()
        .optional()
        .describe("LinkedIn profile URL for the contact"),
      phone: z
        .string()
        .optional()
        .describe("Phone number of the contact"),
      introducedBy: z
        .string()
        .optional()
        .describe("Who introduced you to this contact"),
      notes: z
        .string()
        .max(2000)
        .optional()
        .describe("Initial notes about the contact or how you met"),
      source: z
        .string()
        .optional()
        .describe("How the contact was sourced — e.g. manual, linkedin, email"),
    }),
    execute: async (input) => {
      return createContactRest(userId, {
        name: input.name,
        email: input.email,
        title: input.title,
        companyId: input.companyId,
        relationship: input.relationship,
        linkedinUrl: input.linkedinUrl,
        phone: input.phone,
        introducedBy: input.introducedBy,
        notes: input.notes,
        source: input.source,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: updateContactWarmth
// ---------------------------------------------------------------------------
export function makeUpdateContactWarmthTool(userId: string) {
  return tool({
    description:
      "Log an interaction with a contact — meeting, email, call, LinkedIn message, or any touchpoint. Updates lastContactAt to now and appends an interaction note. Warmth is recalculated automatically from the new lastContactAt.",
    inputSchema: z.object({
      contactId: z
        .string()
        .describe("UUID of the contact you interacted with"),
      interactionType: z
        .enum([
          "meeting",
          "email",
          "call",
          "linkedin_message",
          "coffee_chat",
          "event",
          "other",
        ])
        .describe("Type of interaction that occurred"),
      note: z
        .string()
        .min(1)
        .max(1000)
        .describe(
          "Brief description of the interaction — what was discussed, any follow-ups agreed upon"
        ),
    }),
    execute: async (input) => {
      const formattedNote = `[${input.interactionType.replace(/_/g, " ")}] ${input.note}`;
      return updateContactActivity(userId, input.contactId, formattedNote);
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: getNetworkOverview
// ---------------------------------------------------------------------------
export function makeGetNetworkOverviewTool(userId: string) {
  return tool({
    description:
      "Get a full overview of the user's network: warmth distribution, contacts by company, cooling alerts, and cold contacts sorted by days since last contact.",
    inputSchema: z.object({
      includeColding: z
        .boolean()
        .default(true)
        .describe("Include the list of cooling-off contacts (7–14 days)"),
      includeCold: z
        .boolean()
        .default(true)
        .describe("Include the list of cold contacts (14+ days)"),
    }),
    execute: async (input) => {
      const [stats, coolingContacts, coldContacts] = await Promise.all([
        getContactStats(userId),
        input.includeColding ? getCoolingContacts(userId) : Promise.resolve([]),
        input.includeCold ? getColdContacts(userId) : Promise.resolve([]),
      ]);

      return {
        stats,
        coolingContacts,
        coldContacts,
        summary: `${stats.total} total contacts across ${stats.companiesRepresented} companies. ${stats.warm} warm, ${stats.cooling} cooling, ${stats.cold} cold. ${coldContacts.length > 0 ? `${coldContacts.length} require immediate re-engagement.` : "No cold contacts — network is healthy."}`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: suggestOutreach
// ---------------------------------------------------------------------------
export function makeSuggestOutreachTool(userId: string) {
  return tool({
    description:
      "Generate a personalized re-engagement message for a cold or cooling contact. Based on their role, company, and last interaction note. Returns a ready-to-send draft.",
    inputSchema: z.object({
      contactId: z
        .string()
        .describe("UUID of the contact to re-engage"),
      contactName: z
        .string()
        .describe("Full name of the contact"),
      contactTitle: z
        .string()
        .optional()
        .describe("Their job title for context"),
      company: z
        .string()
        .optional()
        .describe("Company they work at"),
      daysSinceContact: z
        .number()
        .int()
        .min(0)
        .describe("Days since last interaction — used to calibrate tone"),
      lastInteractionNote: z
        .string()
        .optional()
        .describe(
          "What the last interaction was about — helps personalize the re-engagement"
        ),
      outreachGoal: z
        .enum([
          "rekindle_relationship",
          "request_intro",
          "share_update",
          "coffee_chat",
          "follow_up_on_offer",
        ])
        .default("rekindle_relationship")
        .describe("What you want to accomplish with this message"),
    }),
    execute: async (input) => {
      void userId;

      const urgency =
        input.daysSinceContact >= 30
          ? "high"
          : input.daysSinceContact >= 14
          ? "medium"
          : "low";

      const toneNote =
        urgency === "high"
          ? "Keep it brief and genuine — don't over-apologize for the gap, just reconnect naturally."
          : urgency === "medium"
          ? "Warm and casual — acknowledge time has passed, but don't make it awkward."
          : "Light touch — just a friendly check-in.";

      const contextLine = input.lastInteractionNote
        ? `Last interaction: ${input.lastInteractionNote}.`
        : `No recent interaction on record — opening message should feel natural, not transactional.`;

      const goalMessage: Record<string, string> = {
        rekindle_relationship: `Reconnect genuinely — reference something specific about ${input.company ?? "their work"} or your last conversation if possible.`,
        request_intro: `Reconnect first, then — only if the conversation flows naturally — mention you'd love their perspective on someone at ${input.company ?? "their organization"}.`,
        share_update: `Share a brief personal update that's relevant to them or their industry, making it feel like a natural check-in rather than a broadcast.`,
        coffee_chat: `Propose a casual 20-minute catch-up — frame it around their expertise or something happening in their world, not just your needs.`,
        follow_up_on_offer: `Follow up on the specific offer or connection they mentioned. Reference it directly and express genuine appreciation for their generosity.`,
      };

      const body = `Hi ${input.contactName.split(" ")[0]},

Hope you're doing well — it's been a while since we last connected. ${input.lastInteractionNote ? `I've been thinking about our conversation around ${input.lastInteractionNote.split(" ").slice(0, 6).join(" ")}...` : `I wanted to reach back out.`}

${input.outreachGoal === "rekindle_relationship" ? `I've been keeping up with what's happening at ${input.company ?? "your space"} and would love to catch up when you have a few minutes.` : ""}${input.outreachGoal === "request_intro" ? `I've been exploring opportunities in your space and your perspective would be incredibly valuable. Would love to reconnect.` : ""}${input.outreachGoal === "share_update" ? `A lot has happened on my end — would love to share and hear what you've been up to as well.` : ""}${input.outreachGoal === "coffee_chat" ? `Would you be open to a quick 20-minute call sometime in the next couple of weeks? No agenda — just a genuine catch-up.` : ""}${input.outreachGoal === "follow_up_on_offer" ? `I wanted to follow up on your generous offer to connect me with your team at ${input.company ?? "your company"}. I'd love to take you up on that when the time is right.` : ""}

Best,
[Your Name]`;

      return {
        contactId: input.contactId,
        contactName: input.contactName,
        company: input.company ?? null,
        urgency,
        daysSinceContact: input.daysSinceContact,
        toneGuidance: toneNote,
        goalGuidance: goalMessage[input.outreachGoal],
        contextNote: contextLine,
        draft: body,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCNOTools(userId: string) {
  return {
    queryContacts: makeQueryContactsTool(userId),
    addContact: makeAddContactTool(userId),
    updateContactWarmth: makeUpdateContactWarmthTool(userId),
    getNetworkOverview: makeGetNetworkOverviewTool(userId),
    suggestOutreach: makeSuggestOutreachTool(userId),
  };
}
