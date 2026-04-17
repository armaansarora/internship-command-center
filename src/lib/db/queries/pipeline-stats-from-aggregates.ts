export interface PipelineStats {
  total: number;
  discovered: number;
  applied: number;
  screening: number;
  interviewing: number;
  offers: number;
  stale: number;
  weeklyActivity: number;
  conversionRate: number;
  scheduledInterviews: number;
  byStatus: Record<string, number>;
  appliedToScreeningRate: number;
  screeningToInterviewRate: number;
  interviewToOfferRate: number;
  staleCount: number;
  warmCount: number;
  conversionLabel: string;
}

/** Shared math for pipeline rates (used by RPC fast path + legacy path). */
export function buildPipelineStatsFromAggregates(
  byStatus: Record<string, number>,
  totalActive: number,
  staleCount: number,
  warmCount: number,
  weeklyActivity: number
): PipelineStats {
  const applied = byStatus["applied"] ?? 0;
  const screening = byStatus["screening"] ?? 0;
  const interviewScheduled = byStatus["interview_scheduled"] ?? 0;
  const interviewing = byStatus["interviewing"] ?? 0;
  const offer = byStatus["offer"] ?? 0;

  const interviewTotal = interviewScheduled + interviewing;

  const appliedToScreeningRate = applied > 0 ? (screening / applied) * 100 : 0;
  const screeningToInterviewRate =
    screening > 0 ? (interviewTotal / screening) * 100 : 0;
  const interviewToOfferRate =
    interviewTotal > 0 ? (offer / interviewTotal) * 100 : 0;

  const conversionRate = applied > 0 ? (offer / applied) * 100 : 0;
  const conversionLabel = `${conversionRate.toFixed(0)}%`;

  return {
    total: totalActive,
    discovered: byStatus["discovered"] ?? 0,
    applied,
    screening,
    interviewing: interviewTotal,
    offers: offer,
    stale: staleCount,
    weeklyActivity,
    conversionRate,
    scheduledInterviews: interviewScheduled,
    byStatus,
    appliedToScreeningRate,
    screeningToInterviewRate,
    interviewToOfferRate,
    staleCount,
    warmCount,
    conversionLabel,
  };
}
