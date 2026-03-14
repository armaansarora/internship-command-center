import Anthropic from '@anthropic-ai/sdk';
import { RESUME } from '@/lib/resume';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function generateInterviewPrep(
  company: string,
  role: string,
  applicationId: number
): Promise<string> {
  const appId = String(applicationId);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let content: string;

  if (!apiKey) {
    content = generateFallbackPrep(company, role);
  } else {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are an interview preparation assistant for Armaan Arora, a sophomore at NYU Schack Institute of Real Estate. Generate concise, actionable interview prep packets.`,
      messages: [
        {
          role: 'user',
          content: `Generate an interview preparation packet for Armaan Arora interviewing at ${company} for the ${role} position.

RESUME DATA:
${JSON.stringify(RESUME, null, 2)}

Please include:
1. **Company Overview** — Brief summary of ${company} and what they do
2. **Likely Interview Questions** — 8-10 questions they might ask, tailored to the role
3. **Talking Points** — Key experiences from Armaan's resume to highlight
4. **Armaan's Relevant Experience** — Specific projects and skills that align with this role
5. **Questions to Ask** — 3-5 thoughtful questions Armaan should ask the interviewer

Format in clean markdown.`,
        },
      ],
    });

    content =
      response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // Save to documents table
  await db.insert(documents).values({
    applicationId: appId,
    type: 'prep_packet',
    title: `Interview Prep: ${company} - ${role}`,
    content,
    version: 1,
    isActive: true,
    generatedBy: apiKey ? 'anthropic' : 'template',
  });

  return content;
}

export async function getInterviewPrep(
  applicationId: number
): Promise<{ id: string; content: string; createdAt: string }[]> {
  const appId = String(applicationId);

  const rows = await db
    .select({
      id: documents.id,
      content: documents.content,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.type, 'prep_packet'),
        eq(documents.applicationId, appId)
      )
    )
    .orderBy(desc(documents.createdAt));

  return rows.map((row) => ({
    id: row.id,
    content: row.content ?? '',
    createdAt: row.createdAt,
  }));
}

function generateFallbackPrep(company: string, role: string): string {
  return `# Interview Prep: ${company} - ${role}

## Company Overview
Research ${company} before your interview. Check their website, recent news, and LinkedIn page.

## Likely Interview Questions
1. Tell me about yourself and why you're interested in ${company}.
2. What experience do you have relevant to the ${role} position?
3. Describe a time you had to learn something quickly.
4. How do you handle multiple deadlines or competing priorities?
5. What do you know about ${company}'s work?
6. Describe a project where you had to be detail-oriented.
7. How have your studies at NYU Schack prepared you for this role?
8. Tell me about a time you worked on a team.

## Talking Points
- **National Lecithin internship**: A/P and A/R management, invoice logging, payment tracking
- **AI modernization initiative**: Identified process inefficiencies, worked with external partner (Perlon Labs)
- **NYU Schack coursework**: RE Finance, RE Law, Urban RE Economics, RE Development
- **SREG Mentorship Program**: Industry exposure and professional development

## Questions to Ask
1. What does a typical day look like for someone in this role?
2. What are the biggest challenges facing the team right now?
3. How does ${company} support the development of interns/junior team members?
4. What projects would I be working on this summer?
5. What do you enjoy most about working at ${company}?`;
}
