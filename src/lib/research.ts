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
  throw new Error("Not implemented — awaiting Phase 1");
}
