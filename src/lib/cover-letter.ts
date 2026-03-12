import Anthropic from '@anthropic-ai/sdk';
import { RESUME } from '@/lib/resume';
import type { CompanyResearchData } from '@/lib/research';

export interface CoverLetterResult {
  content: string;
  company: string;
  role: string;
  generatedAt: Date;
}

/**
 * System prompt calibrated to Armaan's actual voice — extracted from his
 * real cover letter to Beam Living. Key patterns:
 * - First person, direct sentences ("I am writing to apply…")
 * - Concrete details over abstract claims
 * - "I learned quickly that…" → reflection on lessons, not just tasks
 * - Connects day-to-day work to the target role's needs
 * - Never uses "synergize", "thrilled", "passionate" — just says what he did and why it matters
 */
const SYSTEM_PROMPT = `You are writing cover letters AS Armaan Arora — a sophomore at NYU Schack Institute of Real Estate (B.S. Real Estate, Real Estate Finance concentration, 3.58 cumulative GPA, 3.87 major GPA, Dean's List Fall 2025).

VOICE & STYLE (match this exactly — extracted from Armaan's real cover letters):
- First person, direct, honest. "I am organized, dependable, and comfortable handling work that requires detail and follow-through."
- Show don't tell: Instead of "I am a hard worker", describe what you actually did and let the reader draw their own conclusion.
- Reflective: "I learned quickly that when records are messy or a status is unclear, small issues become bigger problems."
- Connect specifics: Don't just list tasks — explain WHY they matter for the target role.
- End paragraphs by bridging to the company: "That is the same mindset I would bring to [specific tasks at target company]."
- Closing is always brief and honest — one or two sentences. No groveling.

STRICT RULES:
1. NEVER fabricate facts. Only use information from the provided resume data and verified company research.
2. If you don't have specific company information, write about genuine interest in their sector — do NOT make up details about the company.
3. Follow the exact 5-paragraph structure below.
4. Keep it under 450 words total.
5. Start with "Dear Hiring Committee," or "Dear Hiring Manager," — no preamble.

5-PARAGRAPH STRUCTURE:
1. Opening — "I am writing to apply for the [role] position at [company]." Then genuine interest: what specifically about this company appeals, referencing research if available. Connect to being a Real Estate student at NYU Schack.
2. National Lecithin bridge — organized, dependable, detail and follow-through. Specific examples: A/P and A/R records, logging invoices, posting payments, tracking balances, processing purchase orders. "I got in the habit of keeping clean notes, checking details before sending things forward, and making sure people knew where something stood." Bridge to the target role's day-to-day work.
3. Problem-solving — AI modernization initiative at National Lecithin. Identified tools slowing the team, worked with an external partner (Perlon Labs) to improve workflows. Key insight: "learning how to look at a process, identify where things break down, and make it easier for the next person doing the work."
4. SREG mentorship & academic growth — the SREG Mentorship Program has given exposure to RE fundamentals, alumni mentorship, and conversations with professionals. Coursework in RE Finance, RE Law, Urban RE Economics, RE Development. "helped me ask better questions and think beyond the finance side of real estate."
5. Brief close — "I would be grateful for the opportunity to contribute this summer and learn from [company]'s team. I bring a strong work ethic, attention to detail, and a genuine willingness to help with day-to-day tasks that keep projects and operations moving." Then "Sincerely, Armaan Arora"`;

export async function generateCoverLetter(
  company: string,
  role: string,
  research: CompanyResearchData | null,
): Promise<CoverLetterResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      content: generateFallbackLetter(company, role, research),
      company,
      role,
      generatedAt: new Date(),
    };
  }

  const client = new Anthropic({ apiKey });

  const researchContext = research
    ? `
VERIFIED COMPANY RESEARCH (use ONLY these facts — do NOT invent details):
- Overview: ${research.overview}
- Recent News: ${research.recentNews.length > 0 ? research.recentNews.join('; ') : 'None available'}
- Leadership: ${research.leadership.length > 0 ? research.leadership.join('; ') : 'None available'}
- Deals/Activity: ${research.deals.length > 0 ? research.deals.join('; ') : 'None available'}
- Research source: ${research.source}
`
    : 'No company research available. Write about general interest in the sector without making up company-specific details.';

  const userPrompt = `Write a cover letter for Armaan Arora applying to ${company} for the ${role} position.

RESUME DATA:
${JSON.stringify(RESUME, null, 2)}

${researchContext}

Write the cover letter now. Start directly with the greeting — no preamble or commentary.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    content,
    company,
    role,
    generatedAt: new Date(),
  };
}

function generateFallbackLetter(
  company: string,
  role: string,
  research: CompanyResearchData | null,
): string {
  const companyInfo = research?.overview
    ? `I am interested in this role because ${research.overview.toLowerCase().includes(company.toLowerCase()) ? research.overview : `of ${company}'s work — ${research.overview}`}`
    : `I am interested in this role because of ${company}'s work in the industry`;

  return `Dear Hiring Committee,

I am writing to apply for the ${role} position at ${company}. I am a Real Estate student at NYU Schack, and ${companyInfo}.

I think I would be a strong fit for this role because I am organized, dependable, and comfortable handling work that requires detail and follow-through. In my internship at National Lecithin, I kept A/P and A/R records up to date, logged invoices, posted payments, tracked balances, and processed purchase orders. I learned quickly that when records are messy or a status is unclear, small issues become bigger problems. I got in the habit of keeping clean notes, checking details before sending things forward, and making sure people knew where something stood. That is the same mindset I would bring to ${company}.

I also developed stronger problem-solving skills by helping with an internal modernization effort at National Lecithin. I identified tools that were slowing the team down and worked with an external partner to improve workflows. What I liked most about that experience was not just the technology side — it was learning how to look at a process, identify where things break down, and make it easier for the next person doing the work.

My involvement in the SREG Mentorship Program has also shaped how I think about real estate. It has given me exposure to real estate fundamentals, alumni and peer mentorship, and conversations with professionals through the broader SREG community. That experience has helped me ask better questions and think beyond the finance side of real estate. My coursework in RE Finance, RE Law, RE Development, and Urban RE Economics has provided the technical foundation that complements my practical experience.

I would be grateful for the opportunity to contribute and learn from ${company}'s team. I bring a strong work ethic, attention to detail, and a genuine willingness to help with day-to-day tasks that keep projects and operations moving.

Sincerely,
Armaan Arora`;
}
