import { db } from '@/db';
import { companyResearch } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface CompanyResearchData {
  recentNews: string[];
  leadership: string[];
  deals: string[];
  overview: string;
  source: 'tavily' | 'cache' | 'fallback';
  fetchedAt: Date;
}

// Pre-loaded intel for key companies (fallback when Tavily unavailable)
const PRELOADED_INTEL: Record<string, Partial<CompanyResearchData>> = {
  'JPMorgan Chase': {
    overview:
      'JPMorgan Chase is the largest bank in the United States by assets. The Commercial Real Estate division provides lending, advisory, and capital markets solutions across all major property types.',
    leadership: [
      'Jamie Dimon — Chairman & CEO',
      'Mary Erdoes — CEO, Asset & Wealth Management',
    ],
    deals: [
      'Major CRE lending platform with $100B+ portfolio',
      'Active in CMBS and bridge lending',
    ],
  },
  'Goldman Sachs': {
    overview:
      'Goldman Sachs is a leading global financial institution offering investment banking, securities, asset management, and consumer banking services.',
    leadership: [
      'David Solomon — Chairman & CEO',
      'John Waldron — President & COO',
    ],
    deals: [
      'Goldman Sachs Alternatives manages $450B+ AUM',
      'Active real estate fund platform',
    ],
  },
  Blackstone: {
    overview:
      'Blackstone is the largest alternative asset manager in the world with $1T+ AUM. Blackstone Real Estate is the largest commercial real estate owner globally.',
    leadership: [
      'Stephen Schwarzman — Chairman, CEO & Co-Founder',
      'Jonathan Gray — President & COO',
      'Kathleen McCarthy — Global Co-Head of Real Estate',
    ],
    deals: [
      'BREIT — largest non-traded REIT',
      'Major logistics, multifamily, and data center investments',
    ],
  },
  Brookfield: {
    overview:
      'Brookfield Asset Management is a global alternative asset manager with $900B+ AUM, specializing in real estate, infrastructure, renewable energy, and private equity.',
    leadership: [
      'Bruce Flatt — CEO',
      'Connor Teskey — President',
    ],
    deals: [
      'One of the largest real estate portfolios globally',
      'Active in office, retail, multifamily, and logistics',
    ],
  },
  KKR: {
    overview:
      'KKR is a global investment firm managing $553B+ AUM across private equity, credit, and real assets. KKR Real Estate invests across property types globally.',
    leadership: [
      'Scott Nuttall — Co-CEO',
      'Joe Bae — Co-CEO',
      'Ralph Rosenberg — Head of Real Estate',
    ],
    deals: [
      'Active in logistics, multifamily, and student housing',
      'Growing real estate credit platform',
    ],
  },
};

/**
 * Fetch company research — tries cache first, then Tavily, then fallback
 */
export async function getCompanyResearch(
  companyName: string
): Promise<CompanyResearchData> {
  // 1. Check cache (valid for 7 days)
  const cached = await db
    .select()
    .from(companyResearch)
    .where(eq(companyResearch.companyName, companyName))
    .get();

  if (cached && cached.researchJson) {
    const ageMs = Date.now() - cached.fetchedAt.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (ageMs < sevenDays) {
      return {
        ...(cached.researchJson as Omit<CompanyResearchData, 'source' | 'fetchedAt'>),
        source: 'cache',
        fetchedAt: cached.fetchedAt,
      };
    }
  }

  // 2. Try Tavily API
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const result = await fetchFromTavily(companyName, tavilyKey);
      // Save to cache
      if (cached) {
        await db.update(companyResearch)
          .set({
            researchJson: result as unknown as Record<string, unknown>,
            fetchedAt: new Date(),
          })
          .where(eq(companyResearch.companyName, companyName))
          .run();
      } else {
        await db.insert(companyResearch)
          .values({
            companyName,
            researchJson: result as unknown as Record<string, unknown>,
            fetchedAt: new Date(),
          })
          .run();
      }
      return { ...result, source: 'tavily', fetchedAt: new Date() };
    } catch (e) {
      console.error('Tavily fetch failed:', e);
    }
  }

  // 3. Fallback to pre-loaded intel
  const fallback = PRELOADED_INTEL[companyName];
  if (fallback) {
    return {
      recentNews: [],
      leadership: fallback.leadership || [],
      deals: fallback.deals || [],
      overview: fallback.overview || `${companyName} is a company in the financial services industry.`,
      source: 'fallback',
      fetchedAt: new Date(),
    };
  }

  // 4. Generic fallback
  return {
    recentNews: [],
    leadership: [],
    deals: [],
    overview: `No research data available for ${companyName}. Add a Tavily API key to enable live research.`,
    source: 'fallback',
    fetchedAt: new Date(),
  };
}

async function fetchFromTavily(
  companyName: string,
  apiKey: string
): Promise<Omit<CompanyResearchData, 'source' | 'fetchedAt'>> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${companyName} company recent news leadership deals 2025 2026`,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract structured info from Tavily results
  const recentNews = (data.results || [])
    .slice(0, 3)
    .map((r: { title: string }) => r.title);

  return {
    recentNews,
    leadership: [],
    deals: [],
    overview: data.answer || `Research results for ${companyName}`,
  };
}
