'use server';

import Anthropic from '@anthropic-ai/sdk';
import { getCompanyResearch } from '@/lib/research';

export interface ComparisonResult {
  company: string;
  role: string;
  culture: string;
  size: string;
  recentDeals: string;
  compensationRange: string;
  fitAssessment: string;
}

export async function generateCompanyComparison(
  companies: Array<{ company: string; role: string }>
): Promise<{ comparisons: ComparisonResult[]; error?: string }> {
  // Fetch research data for each company (refreshes if stale per existing 7-day TTL)
  const researchResults = await Promise.all(
    companies.map(async ({ company, role }) => {
      const research = await getCompanyResearch(company);
      return { company, role, research };
    })
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback without API key
    const fallbackComparisons: ComparisonResult[] = researchResults.map(
      ({ company, role, research }) => ({
        company,
        role,
        culture: research.overview || 'No data available',
        size: 'See company research for details',
        recentDeals:
          research.deals?.length > 0
            ? research.deals.join('; ')
            : 'No recent deals data',
        compensationRange: 'Requires API key for estimate',
        fitAssessment: 'Requires API key for assessment',
      })
    );
    return { comparisons: fallbackComparisons };
  }

  try {
    const client = new Anthropic({ apiKey });

    const companiesContext = researchResults
      .map(
        ({ company, role, research }) =>
          `Company: ${company}
Role: ${role}
Overview: ${research.overview}
Recent News: ${research.recentNews?.join(', ') || 'None available'}
Deals: ${research.deals?.join(', ') || 'None available'}
Leadership: ${research.leadership?.join(', ') || 'None available'}`
      )
      .join('\n\n---\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You generate structured company comparisons for a college student evaluating internship opportunities in real estate and finance.

For each company, provide:
- culture: 1-2 sentence description of company culture and work environment
- size: Employee count or category (e.g., "~50,000 employees" or "Mid-size, 500-1000 employees")
- recentDeals: 2-3 notable recent deals, transactions, or news items
- compensationRange: Estimated intern/entry-level compensation range for the specific role
- fitAssessment: 1-2 sentences on how well an NYU Real Estate Finance student with internship experience at a food ingredients company fits

Output ONLY a JSON array matching this schema. No markdown, no explanation:
[{ "company": "...", "role": "...", "culture": "...", "size": "...", "recentDeals": "...", "compensationRange": "...", "fitAssessment": "..." }]

NEVER fabricate specific numbers or deals. If unsure, say "Data not available" for that field. Use only the provided research data.`,
      messages: [
        {
          role: 'user',
          content: `Compare these companies for an internship decision:\n\n${companiesContext}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        comparisons: researchResults.map(({ company, role }) => ({
          company,
          role,
          culture: 'Failed to parse comparison',
          size: '',
          recentDeals: '',
          compensationRange: '',
          fitAssessment: '',
        })),
        error: 'Could not parse AI response',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ComparisonResult[];
    return { comparisons: parsed };
  } catch (e) {
    return {
      comparisons: researchResults.map(({ company, role }) => ({
        company,
        role,
        culture: 'Error generating comparison',
        size: '',
        recentDeals: '',
        compensationRange: '',
        fitAssessment: '',
      })),
      error: e instanceof Error ? e.message : 'Failed to generate comparison',
    };
  }
}
