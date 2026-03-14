import { db } from '@/db';
import { companies } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface CompanyResearchData {
  recentNews: string[];
  leadership: string[];
  deals: string[];
  overview: string;
  source: 'tavily' | 'cache' | 'fallback';
  fetchedAt: Date;
}

export async function getCompanyResearch(
  companyName: string
): Promise<CompanyResearchData> {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.name, companyName))
    .limit(1);

  if (rows.length === 0) {
    return {
      recentNews: [],
      leadership: [],
      deals: [],
      overview: '',
      source: 'fallback',
      fetchedAt: new Date(),
    };
  }

  const company = rows[0];

  // Parse recentNews — could be a JSON array string or plain text or null
  let recentNews: string[] = [];
  if (company.recentNews) {
    try {
      const parsed = JSON.parse(company.recentNews);
      recentNews = Array.isArray(parsed) ? parsed : [company.recentNews];
    } catch {
      recentNews = [company.recentNews];
    }
  }

  // Parse keyPeople — JSON column, should be an array of strings
  let leadership: string[] = [];
  if (company.keyPeople) {
    const kp = company.keyPeople as unknown;
    if (Array.isArray(kp)) {
      leadership = kp.map(String);
    }
  }

  // financialsSummary maps to deals
  let deals: string[] = [];
  if (company.financialsSummary) {
    try {
      const parsed = JSON.parse(company.financialsSummary);
      deals = Array.isArray(parsed) ? parsed : [company.financialsSummary];
    } catch {
      deals = [company.financialsSummary];
    }
  }

  return {
    recentNews,
    leadership,
    deals,
    overview: company.description ?? '',
    source: 'cache',
    fetchedAt: new Date(),
  };
}
