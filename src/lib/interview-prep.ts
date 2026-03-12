import Anthropic from '@anthropic-ai/sdk';
import { RESUME } from '@/lib/resume';
import { getCompanyResearch } from '@/lib/research';
import { db } from '@/db';
import { interviewPrep, type InterviewPrep } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Generate structured interview prep using Claude API with Tavily research.
 * Saves the result to the interview_prep table and returns the content.
 * Each call creates a NEW row (never overwrites previous prep).
 */
export async function generateInterviewPrep(
  company: string,
  role: string,
  applicationId: number
): Promise<string> {
  const research = await getCompanyResearch(company);

  const apiKey = process.env.ANTHROPIC_API_KEY;

  let content: string;

  if (!apiKey) {
    // Fallback content when no API key
    content = generateFallbackPrep(company, role, research);
  } else {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are preparing Armaan Arora for an interview. Output structured prep in this exact format:

## Company Overview
[2-3 sentences about the company, their focus, recent activity]

## Likely Questions
1. [Question] -- [1-sentence guidance on how to answer]
2. [Question] -- [1-sentence guidance]
... (5-8 questions)

## Talking Points
- [Point connecting Armaan's experience to company needs]
- [Point about relevant coursework or skills]
... (4-6 points)

## Recent News
- [News item relevant to interview conversation]
... (2-4 items)

Keep it actionable -- bullet points, not paragraphs. This is "prepare in 5 minutes before the call."
NEVER fabricate facts. Use only the provided research data and resume.`,
      messages: [
        {
          role: 'user',
          content: `Prepare interview prep for ${company} (${role}).

RESUME: ${JSON.stringify(RESUME, null, 2)}

COMPANY RESEARCH:
${JSON.stringify(research, null, 2)}`,
        },
      ],
    });

    content =
      response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // Save to DB (always creates a new row)
  await db
    .insert(interviewPrep)
    .values({
      applicationId,
      content,
      generatedAt: new Date(),
    })
    .run();

  return content;
}

/**
 * Get the latest interview prep for an application, or null if none exists.
 */
export async function getInterviewPrep(
  applicationId: number
): Promise<InterviewPrep | null> {
  const result = await db
    .select()
    .from(interviewPrep)
    .where(eq(interviewPrep.applicationId, applicationId))
    .orderBy(desc(interviewPrep.generatedAt))
    .get();

  return result ?? null;
}

function generateFallbackPrep(
  company: string,
  role: string,
  research: { overview: string; recentNews: string[]; leadership: string[]; deals: string[] }
): string {
  const newsItems =
    research.recentNews.length > 0
      ? research.recentNews.map((n) => `- ${n}`).join('\n')
      : '- No recent news available. Research the company website before the interview.';

  const leadershipInfo =
    research.leadership.length > 0
      ? research.leadership.map((l) => `- ${l}`).join('\n')
      : '';

  return `## Company Overview
${research.overview || `${company} is a company in the industry. Research their website and recent press releases before the interview.`}

## Likely Questions
1. Tell me about yourself -- Focus on NYU Schack, Real Estate Finance concentration, and National Lecithin internship
2. Why ${company}? -- Connect your interest in ${role} to specific aspects of their work
3. Describe a time you solved a problem -- Use the AI modernization initiative at National Lecithin
4. What relevant coursework have you taken? -- Mention RE Finance, RE Law, Urban RE Economics, RE Development
5. Where do you see yourself in 5 years? -- Connect real estate education to career goals in the industry
6. How do you handle multiple priorities? -- Reference managing A/P, A/R, purchase orders simultaneously

## Talking Points
- National Lecithin internship: A/P and A/R management, clean record-keeping, attention to detail
- AI modernization initiative: identifying process inefficiencies and working with external partners
- SREG Mentorship Program: building real estate knowledge and professional relationships
- Current coursework: RE Finance, RE Development, RE Accounting and Taxation
- Strong GPA trajectory: 3.87 major GPA, Dean's List Fall 2025

## Recent News
${newsItems}
${leadershipInfo ? `\n## Key People\n${leadershipInfo}` : ''}`;
}
