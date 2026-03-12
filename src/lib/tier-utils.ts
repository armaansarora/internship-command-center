export function suggestTier(role: string): 'T1' | 'T2' | 'T3' | 'T4' {
  const lower = role.toLowerCase();
  const hasRE =
    lower.includes('real estate') ||
    lower.includes('re ') ||
    lower.includes('realty') ||
    lower.includes('property');
  const hasFinance =
    lower.includes('finance') ||
    lower.includes('capital') ||
    lower.includes('credit') ||
    lower.includes('debt') ||
    lower.includes('equity');
  const hasBanking =
    lower.includes('banking') ||
    lower.includes('trading') ||
    lower.includes('analyst') ||
    lower.includes('investment');

  if (hasRE && hasFinance) return 'T1';
  if (hasRE) return 'T2';
  if (hasFinance || hasBanking) return 'T3';
  return 'T4';
}

export function inferSector(
  tier: string
): 'RE Finance' | 'Real Estate' | 'Finance' | 'Other' {
  switch (tier) {
    case 'T1':
      return 'RE Finance';
    case 'T2':
      return 'Real Estate';
    case 'T3':
      return 'Finance';
    default:
      return 'Other';
  }
}

/**
 * Suggest follow-up days based on tier and status.
 * Pure function — safe for client components.
 */
export function suggestFollowUpDays(tier: string, status: string): number {
  if (status === 'interview') return 1;
  if (status === 'in_progress') return 5;
  switch (tier) {
    case 'T1':
      return 7;
    case 'T2':
      return 10;
    default:
      return 14;
  }
}
