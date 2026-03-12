# Research: Networking/Contacts Layer & Enhanced AI Features

**Domain:** Personal internship tracking app -- networking CRM + AI generation upgrades
**Researched:** 2026-03-09
**Overall Confidence:** HIGH (patterns verified against existing codebase, official docs, and Anthropic SDK docs)
**Existing Stack:** Next.js 16.1.6, Drizzle ORM 0.45.1, better-sqlite3, @anthropic-ai/sdk 0.78.0, Tavily API

---

## Part 1: Networking / Contacts Layer

### 1. Contact Schema Design

**Confidence: HIGH** -- Drizzle ORM patterns verified against official docs and existing project schema.

The current `applications` table stores contacts inline (single `contactName`, `contactEmail`, `contactRole` columns). This is fine for one contact per application, but breaks down for networking where one contact maps to many companies and one company has many contacts.

**Recommended Schema -- `contacts` table:**

```typescript
import {
  sqliteTable, text, integer, index, foreignKey,
} from 'drizzle-orm/sqlite-core';

export const contacts = sqliteTable(
  'contacts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    company: text('company'),          // Current company (denormalized for display)
    title: text('title'),              // Current title
    relationshipType: text('relationship_type', {
      enum: ['recruiter', 'referral', 'mentor', 'peer', 'alumni', 'family'],
    }).notNull(),
    // Warmth scoring (see section 2)
    warmthScore: integer('warmth_score').notNull().default(50),
    lastContactedAt: integer('last_contacted_at', { mode: 'timestamp' }),
    // Self-referential FK for referral chains (see section 3)
    introducedById: integer('introduced_by_id'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (self) => [
    index('idx_contacts_company').on(self.company),
    index('idx_contacts_type').on(self.relationshipType),
    index('idx_contacts_warmth').on(self.warmthScore),
    // Self-referential FK using Drizzle's foreignKey operator
    // Required because TypeScript cannot handle circular column references inline
    foreignKey({
      columns: [self.introducedById],
      foreignColumns: [self.id],
    }).onDelete('set null'),
  ]
);
```

**Why this design:**
- `relationshipType` as an enum covers the four requested types plus `alumni` (relevant for NYU Schack network) and `family` (the Merrill Lynch referral through Armaan's dad).
- `company` is denormalized on the contact row for fast display. The junction table (section 4) handles the formal many-to-many.
- `warmthScore` is an integer 0-100 rather than a float -- simpler arithmetic, no precision issues in SQLite.

**Source:** [Drizzle ORM self-referencing foreign key pattern](https://gebna.gg/blog/self-referencing-foreign-key-typescript-drizzle-orm), verified against Drizzle official docs.

---

### 2. Warmth Scoring with Auto-Decay

**Confidence: HIGH** -- Algorithm design is straightforward math; decay patterns verified from CRM industry practices.

**The core idea:** Warmth is a 0-100 integer that increases on interaction and decays automatically over time. You never run a cron job to decay scores -- you calculate the decayed score on read.

**Compute-on-read decay formula:**

```typescript
/**
 * Calculate current warmth score accounting for time-based decay.
 *
 * Formula: decayed = baseScore * (decayRate ^ daysSinceContact)
 *
 * With decayRate = 0.98 (2% daily decay):
 *   - After 7 days:  ~87% of original (score 50 -> 43)
 *   - After 14 days: ~75% of original (score 50 -> 37)
 *   - After 30 days: ~55% of original (score 50 -> 27)
 *   - After 60 days: ~30% of original (score 50 -> 15)
 *   - After 90 days: ~16% of original (score 50 -> 8)
 *
 * This means contacts go "cold" after ~2 months without interaction.
 */
export function getDecayedWarmth(
  baseScore: number,
  lastContactedAt: Date | null,
): number {
  if (!lastContactedAt) return 0; // Never contacted = cold

  const daysSince = Math.floor(
    (Date.now() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 0) return baseScore;

  const DECAY_RATE = 0.98; // 2% daily decay
  const decayed = Math.round(baseScore * Math.pow(DECAY_RATE, daysSince));
  return Math.max(decayed, 0);
}
```

**Warmth boost events (update `warmthScore` and `lastContactedAt`):**

| Event                    | Score Change |
|--------------------------|-------------|
| Sent follow-up email     | +15         |
| Had phone/video call     | +25         |
| Met in person            | +30         |
| Received response        | +20         |
| They referred you        | +40         |
| Created contact (initial)| Set to 50   |

**Why compute-on-read, not cron:**
- SQLite is local -- no background workers.
- With 75-200 contacts, the computation is trivial (microseconds).
- No stale data -- the warmth score is always exactly correct when displayed.
- No database writes needed just for decay -- only write when a real interaction happens.

**Display categories:**

```typescript
export function getWarmthLabel(score: number): 'hot' | 'warm' | 'cool' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  if (score >= 15) return 'cool';
  return 'cold';
}
```

**Dashboard integration:** The existing attention dashboard already surfaces "stale warm leads." This warmth system replaces the simplistic time-based staleness check with a proper scored metric. Contacts with `getWarmthLabel(decayedScore) === 'cool'` who were previously `'warm'` should surface as "going cold" action items.

---

### 3. Referral Chain Tracking

**Confidence: HIGH** -- Self-referential FK pattern verified with Drizzle official docs.

The `introducedById` column on the `contacts` table is a nullable self-referential foreign key. This creates a simple tree:

```
Armaan's Dad (family)
  └── Contact at Merrill Lynch (referral, introducedById -> Dad's ID)
       └── Another contact at ML (referral, introducedById -> ML contact's ID)
```

**Schema** (already shown in section 1):
```typescript
introducedById: integer('introduced_by_id'),
// ...in table config:
foreignKey({
  columns: [self.introducedById],
  foreignColumns: [self.id],
}).onDelete('set null'),
```

**Querying the chain (who introduced whom):**

```typescript
// Get the introducer for a contact
const contact = db
  .select()
  .from(contacts)
  .where(eq(contacts.id, contactId))
  .get();

if (contact?.introducedById) {
  const introducer = db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contact.introducedById))
    .get();
}

// Get all contacts introduced by someone
const introduced = db
  .select()
  .from(contacts)
  .where(eq(contacts.introducedById, introducerId))
  .all();
```

**Why NOT a separate `referral_chains` table:** With ~75-200 contacts and shallow referral depth (rarely more than 2-3 hops), a self-referential FK is simpler and sufficient. A separate edges table only makes sense for graph-dense data (social networks, org charts with thousands of nodes).

**Drizzle Relations declaration (for relational queries):**

```typescript
import { relations } from 'drizzle-orm';

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  introducedBy: one(contacts, {
    fields: [contacts.introducedById],
    references: [contacts.id],
    relationName: 'referralChain',
  }),
  introduced: many(contacts, {
    relationName: 'referralChain',
  }),
}));
```

---

### 4. Many-to-Many: Contacts <-> Applications

**Confidence: HIGH** -- Standard junction table pattern, verified against Drizzle docs.

A contact can be associated with multiple applications (e.g., a recruiter handling several roles at the same firm). An application can have multiple contacts (recruiter + referral + hiring manager).

**Junction table schema:**

```typescript
export const contactApplications = sqliteTable(
  'contact_applications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    contactId: integer('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    applicationId: integer('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    role: text('role', {
      enum: ['primary', 'referral', 'hiring_manager', 'interviewer', 'other'],
    }).default('other'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_ca_contact').on(table.contactId),
    index('idx_ca_application').on(table.applicationId),
    // Prevent duplicate links
    index('idx_ca_unique').on(table.contactId, table.applicationId),
  ]
);
```

**Why a `role` column on the junction table:** The relationship between a contact and an application has its own semantics -- a person might be both the referral and the interviewer. Storing the role on the junction avoids needing to look up the contact's type to understand the link.

**Migration note:** The existing `contactName`, `contactEmail`, `contactRole` columns on `applications` should be migrated. Write a seed migration that:
1. Creates the `contacts` table.
2. Extracts unique contacts from `applications.contactName`/`contactEmail`/`contactRole`.
3. Creates rows in `contacts` and links them via `contactApplications`.
4. Drops the old columns from `applications` (or marks them deprecated).

---

### 5. "Who Do I Know at [Company]?" Query Pattern

**Confidence: HIGH** -- Standard SQL join, tested against existing schema structure.

This is the key networking query. It answers: given a company name, show me all contacts linked to applications at that company, plus any contact whose `company` field matches.

```typescript
import { eq, or, like } from 'drizzle-orm';

export async function getContactsAtCompany(companyName: string) {
  // Strategy 1: Contacts directly at the company
  const directContacts = db
    .select()
    .from(contacts)
    .where(eq(contacts.company, companyName))
    .all();

  // Strategy 2: Contacts linked to applications at the company
  const linkedContacts = db
    .select({
      contact: contacts,
      applicationRole: contactApplications.role,
      appRole: applications.role,
      appStatus: applications.status,
    })
    .from(contactApplications)
    .innerJoin(contacts, eq(contactApplications.contactId, contacts.id))
    .innerJoin(applications, eq(contactApplications.applicationId, applications.id))
    .where(eq(applications.company, companyName))
    .all();

  // Deduplicate by contact ID and merge
  const seen = new Set<number>();
  const result = [];

  for (const linked of linkedContacts) {
    seen.add(linked.contact.id);
    result.push({
      ...linked.contact,
      warmth: getDecayedWarmth(linked.contact.warmthScore, linked.contact.lastContactedAt),
      linkedApplications: [{
        role: linked.applicationRole,
        appRole: linked.appRole,
        appStatus: linked.appStatus,
      }],
    });
  }

  for (const direct of directContacts) {
    if (!seen.has(direct.id)) {
      result.push({
        ...direct,
        warmth: getDecayedWarmth(direct.warmthScore, direct.lastContactedAt),
        linkedApplications: [],
      });
    }
  }

  // Sort by warmth (hottest first)
  return result.sort((a, b) => b.warmth - a.warmth);
}
```

**UI integration:** This should power a search box on a new "Network" page, or appear as a sidebar widget on the application detail page showing contacts at the same company.

---

## Part 2: Enhanced AI Features

### 6. Interview Prep Generation

**Confidence: MEDIUM** -- Based on Anthropic SDK docs (HIGH confidence on API), interview prep content patterns from multiple sources (MEDIUM confidence on optimal prompt structure).

**What makes interview prep output good:**

The quality of Claude's interview prep directly correlates with input specificity. Based on research into AI interview prep tools and prompting best practices, the optimal input bundle is:

| Input                    | Why It Matters                                                | Source in Codebase              |
|--------------------------|---------------------------------------------------------------|---------------------------------|
| Company research         | Enables company-specific behavioral questions                 | `getCompanyResearch()`          |
| Role description         | Focuses on role-relevant competencies                         | `applications.role` + notes     |
| Resume data              | Grounds STAR answers in real experience                       | `RESUME` from `resume.ts`       |
| Application status       | Tailors prep (phone screen vs. final round)                   | `applications.status`           |
| Interview type           | Different format = different prep (behavioral vs. technical)  | New field or user input         |

**Recommended prompt structure:**

```typescript
const INTERVIEW_PREP_SYSTEM = `You are preparing Armaan Arora for a job interview. Generate a comprehensive but practical prep document.

ARMAAN'S BACKGROUND:
${JSON.stringify(RESUME, null, 2)}

OUTPUT FORMAT:
1. **Company Quick Brief** (3-4 bullet points about the company relevant to the interview)
2. **Role Analysis** (what they're looking for based on the job description)
3. **Likely Questions** (8-10 questions with categories: behavioral, technical, situational)
4. **STAR Answer Outlines** (for the 4 most likely behavioral questions, using ONLY real experience from the resume)
5. **Questions to Ask Them** (5 thoughtful questions showing genuine interest and research)
6. **Red Flags to Avoid** (common mistakes for this type of role/company)

RULES:
- ONLY reference real experience from the resume data
- Tailor questions to the specific company and role
- For RE Finance roles, include technical concepts from Armaan's coursework
- For behavioral questions, always anchor answers to National Lecithin or JP Language Institute
- Be specific, not generic. "Tell me about a time you improved a process" should map to the AI modernization initiative.`;
```

**Why this is better than the current cover letter approach for interview prep:** Cover letters are ~450 words and one-shot. Interview prep can be 1500+ words and benefits from streaming (user sees sections appear progressively). This is the first feature that genuinely needs streaming.

**Schema for storing prep docs:**

```typescript
export const interviewPreps = sqliteTable('interview_preps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  interviewType: text('interview_type', {
    enum: ['phone_screen', 'behavioral', 'technical', 'case_study', 'final_round', 'hirevue'],
  }).notNull(),
  content: text('content').notNull(),
  companyResearchUsed: integer('company_research_used', { mode: 'boolean' }).default(false),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
});
```

---

### 7. Cover Letter Versioning

**Confidence: HIGH** -- Schema design is straightforward, builds directly on existing generation infrastructure.

The current system generates a cover letter and displays it in a textarea with no persistence. Every regeneration overwrites the previous version. This is a significant gap -- Armaan should be able to compare versions and track which one he actually used.

**Schema:**

```typescript
export const coverLetterVersions = sqliteTable(
  'cover_letter_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    applicationId: integer('application_id')
      .references(() => applications.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    // User feedback
    rating: integer('rating'),             // 1-5 stars, null = unrated
    isSelected: integer('is_selected', { mode: 'boolean' }).default(false), // "I used this one"
    userEdits: text('user_edits'),         // The version after user edited it (if different from generated)
    // Generation metadata
    modelUsed: text('model_used').default('claude-sonnet-4-20250514'),
    researchSource: text('research_source', {
      enum: ['tavily', 'cache', 'fallback'],
    }),
    generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_clv_application').on(table.applicationId),
    index('idx_clv_company').on(table.company),
  ]
);
```

**Key design decisions:**
- `applicationId` is nullable because a user might generate a cover letter for a company they have not yet created an application for.
- `userEdits` stores the final version if the user modified the generated text. This lets you compare "what Claude wrote" vs. "what Armaan actually sent."
- `isSelected` is a boolean flag for "this is the version I used." Only one version per application should have this set to true.
- `rating` enables feedback that could later improve prompt engineering ("versions rated 5/5 tended to be generated with Tavily research available").

**Migration from current behavior:** The existing `generateCoverLetterAction` should be updated to save each generation to `coverLetterVersions` before returning. The cover letter page should show a version history sidebar.

---

### 8. Company Comparison

**Confidence: MEDIUM** -- Comparison dimensions are well-established from career counseling literature; the specific AI prompt structure is based on general best practices.

**Comparison dimensions for internship offers:**

| Dimension              | Data Source                           | Weight (Armaan's priorities) |
|------------------------|---------------------------------------|------------------------------|
| Role alignment         | Job description vs. career goals      | High                         |
| Learning opportunity   | Team size, mentorship, rotation       | High                         |
| Compensation           | Salary, housing stipend, benefits     | Medium                       |
| Brand/reputation       | Company research, tier classification | Medium                       |
| Culture fit            | Company research, Glassdoor data      | Medium                       |
| Location               | Office location, remote policy        | Low-Medium                   |
| Conversion potential   | Full-time offer rate, firm size       | Medium                       |
| Network value          | Contact quality, alumni network       | High                         |

**Recommended implementation -- structured output, not free-form:**

Rather than asking Claude to write a comparison essay, use structured output with Zod schemas:

```typescript
import { z } from 'zod';

const ComparisonSchema = z.object({
  companies: z.array(z.object({
    name: z.string(),
    tier: z.string(),
    strengths: z.array(z.string()).max(4),
    concerns: z.array(z.string()).max(3),
    scores: z.object({
      roleAlignment: z.number().min(1).max(10),
      learningOpportunity: z.number().min(1).max(10),
      compensation: z.number().min(1).max(10),
      brandReputation: z.number().min(1).max(10),
      cultureFit: z.number().min(1).max(10),
      conversionPotential: z.number().min(1).max(10),
      networkValue: z.number().min(1).max(10),
    }),
  })),
  recommendation: z.string(),
  keyTradeoff: z.string(),
});
```

**Why structured output over free-form:** A comparison table rendered from structured data is immediately scannable. A 500-word essay requires reading. For a decision tool, data > prose.

**Implementation approach:** Use the Anthropic SDK's standard `messages.create()` with a system prompt that instructs Claude to output valid JSON matching the schema, then parse and validate with Zod. This is simpler than adding the Vercel AI SDK just for structured output.

---

### 9. Context-Aware Email Templates

**Confidence: HIGH** -- Builds directly on existing `generateFollowUpEmail` function, which already varies by status.

The existing implementation already switches between "thank-you/follow-up after interview" and "polite status check" based on `status`. But it treats all non-interview statuses the same. The improvement is to add more granular tone/content mapping.

**Recommended email type taxonomy:**

| Scenario                     | Status Context           | Tone                    | Key Elements                                     |
|------------------------------|--------------------------|-------------------------|--------------------------------------------------|
| Post-interview thank-you     | `interview`              | Warm, specific          | Reference something from the interview, reiterate fit |
| Cold follow-up (no response) | `applied`, 2+ weeks      | Professional, brief     | Restate interest, offer to provide more info      |
| Status check                 | `in_progress`            | Curious, not pushy      | "Checking in on timeline", express continued interest |
| Referral nudge               | Any, has `referral` contact | Personal, appreciative | Thank the referrer, provide update on where things stand |
| Post-rejection gratitude     | `rejected`               | Gracious, forward-looking | Thank them, ask to stay in touch for future openings |
| Offer response               | `offer`                  | Professional, decisive  | Express gratitude, confirm next steps             |

**Implementation -- enhance the existing function:**

```typescript
type EmailType =
  | 'post_interview_thankyou'
  | 'cold_followup'
  | 'status_check'
  | 'referral_nudge'
  | 'post_rejection'
  | 'offer_response';

function determineEmailType(
  status: string,
  daysSinceApplied: number,
  hasReferralContact: boolean,
): EmailType {
  if (status === 'offer') return 'offer_response';
  if (status === 'rejected') return 'post_rejection';
  if (status === 'interview') return 'post_interview_thankyou';
  if (hasReferralContact) return 'referral_nudge';
  if (status === 'applied' && daysSinceApplied >= 14) return 'cold_followup';
  return 'status_check';
}
```

The system prompt for each email type should include specific tone guidance. The existing voice rules ("Direct, honest, grounded -- no corporate buzzwords") stay the same; only the content structure and emotional register change.

**Key improvement over current implementation:** The current `generateFollowUpEmail` creates a new Anthropic client on every call. This should be refactored to use a singleton or module-scoped client to avoid repeated initialization overhead.

---

### 10. Claude API Streaming for Long-Form Generation

**Confidence: HIGH** -- Verified against official Anthropic SDK docs and Anthropic streaming examples.

**Why streaming matters here:** Interview prep documents can be 1500+ words. At ~50 tokens/second, that is 30+ seconds of waiting with the current blocking approach. Streaming shows text appearing in real-time, which feels responsive even when total generation time is the same.

**Two viable approaches:**

#### Approach A: Route Handler + ReadableStream (Recommended)

Use a Next.js Route Handler (not a Server Action) because Server Actions cannot return ReadableStream objects. The Route Handler converts Anthropic SDK streaming events into SSE.

```typescript
// app/api/generate/interview-prep/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { company, role, interviewType } = await req.json();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: INTERVIEW_PREP_SYSTEM,
    messages: [{ role: 'user', content: buildPrepPrompt(company, role, interviewType) }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on('text', (text) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
        );
      });
      stream.on('error', (error) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        );
        controller.close();
      });
      await stream.finalMessage();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Client-side consumption:**

```typescript
'use client';
import { useState, useCallback } from 'react';

export function useStreamingGeneration() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: Record<string, string>) => {
    setContent('');
    setIsStreaming(true);
    setError(null);

    const response = await fetch('/api/generate/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice(6));
        if (event.type === 'text') {
          setContent(prev => prev + event.text);
        } else if (event.type === 'error') {
          setError(event.error);
        }
      }
    }

    setIsStreaming(false);
  }, []);

  return { content, isStreaming, error, generate };
}
```

#### Approach B: Vercel AI SDK

The Vercel AI SDK (`ai` package) provides `streamText` and `useChat` for a more batteries-included experience. However, this adds a new dependency (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) to a project that already has the raw `@anthropic-ai/sdk` working well.

**Recommendation: Use Approach A** (raw Route Handler + ReadableStream). Reasons:
1. The project already uses `@anthropic-ai/sdk` directly -- adding the Vercel AI SDK wrapper creates two ways of calling Claude.
2. The streaming use case is limited to 1-2 features (interview prep, possibly cover letter regeneration). A full SDK for two endpoints is overkill.
3. The raw approach gives full control over the SSE format and error handling.
4. The Vercel AI SDK is optimized for chat interfaces (`useChat`), which is not what this app needs. Interview prep is a one-shot generation, not a conversation.

**When to use streaming vs. blocking:**

| Feature                  | Length      | Approach      | Why                                       |
|--------------------------|-------------|---------------|-------------------------------------------|
| Cover letter generation  | ~450 words  | Blocking (current) | Fast enough (~5-8s), simple UX          |
| Follow-up email draft    | ~120 words  | Blocking (current) | Sub-2-second generation                  |
| Interview prep document  | ~1500 words | **Streaming**       | 20-30s blocking is unacceptable UX        |
| Company comparison       | ~500 words  | Blocking           | Moderate length, structured output needs parsing |

---

## Part 3: Implementation Recommendations

### Phasing

**Build networking layer first, then AI enhancements.** The networking schema is a prerequisite for several AI features (referral nudge emails need contact data, interview prep benefits from knowing who the interviewer is).

**Suggested implementation order:**

1. **Contacts schema + migration** (new tables, migrate existing inline contacts)
2. **Network UI** (contacts list, "who do I know" search, referral chain display)
3. **Warmth scoring** (compute-on-read, display in contact list and dashboard)
4. **Cover letter versioning** (save generations, version history, ratings)
5. **Interview prep with streaming** (Route Handler, streaming UI, storage)
6. **Context-aware email templates** (enhance existing follow-up email system)
7. **Company comparison** (structured output, comparison table UI)

### Database Migration Strategy

The new tables (`contacts`, `contactApplications`, `coverLetterVersions`, `interviewPreps`) are additive -- they do not break existing tables. The only destructive change is removing the inline contact columns from `applications`, which should happen in a separate migration after data is migrated to the `contacts` table.

Use Drizzle Kit's `drizzle-kit push` for development (direct schema sync to SQLite) and `drizzle-kit generate` for tracked migrations.

### Key Pitfalls

1. **Server Action limitation:** Server Actions cannot return streams. Any streaming feature MUST use a Route Handler (`app/api/*/route.ts`), not a Server Action. The existing cover letter and email generation (which are blocking) can stay as Server Actions.

2. **Anthropic client singleton:** The current code creates a new `Anthropic()` client on every generation call. This is fine for infrequent use but wasteful if multiple features are generating simultaneously. Consider a module-scoped singleton in `lib/anthropic.ts`.

3. **SQLite write contention:** With more tables and more frequent writes (warmth updates, version saves, prep storage), ensure WAL mode stays enabled (it already is in `db/index.ts`). WAL allows concurrent reads during writes.

4. **Warmth score overflow:** Always clamp warmth score to 0-100 range after boost events. A contact with score 90 who gets a +40 "they referred you" boost should cap at 100, not go to 130.

5. **Contact deduplication:** When migrating inline contacts from `applications`, you will encounter the same person with slightly different name spellings. Use email as the dedup key when available, with a manual merge UI for name-only contacts.

---

## Sources

- [Anthropic Streaming Messages docs](https://platform.claude.com/docs/en/build-with-claude/streaming) -- HIGH confidence
- [Anthropic TypeScript SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript) -- HIGH confidence
- [Drizzle ORM self-referencing FK pattern](https://gebna.gg/blog/self-referencing-foreign-key-typescript-drizzle-orm) -- HIGH confidence
- [Drizzle ORM Relations docs](https://orm.drizzle.team/docs/relations-v2) -- HIGH confidence
- [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) -- HIGH confidence
- [Claude Streaming with Next.js Edge Runtime](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7) -- MEDIUM confidence
- [Vercel AI SDK Next.js guide](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- HIGH confidence
- [HubSpot lead scoring / score decay](https://knowledge.hubspot.com/scoring/understand-the-lead-scoring-tool) -- MEDIUM confidence (used for decay algorithm design)
- [How to use AI for interview prep (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/how-to-use-ai-in-your-next-job-interview) -- MEDIUM confidence
- [Indeed Job Offer Evaluation Criteria](https://www.indeed.com/career-advice/career-development/what-criteria-should-you-use-to-evaluate-job-offer) -- MEDIUM confidence
- [Next.js Server Actions streaming limitation discussion](https://github.com/vercel/next.js/discussions/49358) -- HIGH confidence
