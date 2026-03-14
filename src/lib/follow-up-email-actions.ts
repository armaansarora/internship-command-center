'use server';

import { auth } from '@/auth';
import Anthropic from '@anthropic-ai/sdk';
import { RESUME } from '@/lib/resume';

export type TemplateType =
  | 'follow-up'
  | 'thank-you'
  | 'cold-outreach'
  | 'referral-nudge'
  | 'post-interview';

const templateContextMap: Record<TemplateType, string> = {
  'follow-up':
    'This is a polite status check -- express continued interest without being pushy',
  'thank-you':
    'This is a thank-you after an interview -- warm, specific, reference something from the conversation',
  'cold-outreach':
    'This is a cold outreach to a new contact -- brief, respectful, explain why you are reaching out',
  'referral-nudge':
    'This is a gentle nudge to someone who offered to refer you -- grateful, not pushy',
  'post-interview':
    'This is a post-interview follow-up -- professional, reaffirm interest, mention next steps if discussed',
};

const templateFallbackIntros: Record<TemplateType, string> = {
  'follow-up': 'following up on my application',
  'thank-you': 'thank you for the interview opportunity',
  'cold-outreach': 'reaching out to introduce myself',
  'referral-nudge':
    'following up on our conversation about a potential referral',
  'post-interview':
    'thank you for taking the time to meet with me regarding',
};

export async function generateFollowUpEmail(
  company: string,
  role: string,
  status: string,
  contactName: string | null,
  notes: string | null,
  templateType: TemplateType = 'follow-up',
): Promise<{ content: string; error?: string }> {
  const session = await auth();
  if (!session) return { content: '', error: 'Unauthorized' };

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const greeting = contactName
      ? `Dear ${contactName}`
      : 'Dear Hiring Team';
    const statusContext = templateFallbackIntros[templateType];

    return {
      content: `${greeting},

I hope this message finds you well. I am writing to ${statusContext} for the ${role} position at ${company}.

I remain very interested in this opportunity and would welcome the chance to discuss how my experience at NYU Schack and National Lecithin aligns with your team's needs.

Thank you for your time and consideration.

Best regards,
Armaan Arora
NYU Schack Institute of Real Estate '28`,
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    const templateContext = templateContextMap[templateType];

    const prompt = `Write a brief, professional follow-up email for Armaan Arora regarding the ${role} position at ${company}.

ABOUT ARMAAN (use only these facts):
- ${RESUME.education.university.shortName}, ${RESUME.education.university.degree}, ${RESUME.education.university.concentration}
- Cumulative GPA: ${RESUME.education.university.cumulativeGpa}, Major GPA: ${RESUME.education.university.majorGpa}
- Interned at National Lecithin (Summer Analyst): A/P & A/R, AI modernization initiative, supplier negotiations
- Active in SREG Mentorship Program and Schack RE Club
- Currently taking: ${RESUME.coursework.current.join(', ')}

Context:
- Current application status: ${status}
- Contact person: ${contactName || 'Unknown'}
- Notes from Armaan: ${notes || 'None'}
- Email template type: ${templateType}

Voice rules (match Armaan's style):
- Direct, honest, grounded -- no corporate buzzwords
- Professional but not stiff or overly formal
- Brief: under 120 words
- ${templateContext}
- NEVER fabricate anything -- if no notes, keep it general
- Start with the greeting (Dear [name] or Dear Hiring Team), no subject line
- Sign off: "Best regards, Armaan Arora"`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';
    return { content };
  } catch (e) {
    return {
      content: '',
      error: e instanceof Error ? e.message : 'Failed to generate email',
    };
  }
}
