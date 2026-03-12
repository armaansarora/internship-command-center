export type Tier = 'T1' | 'T2' | 'T3' | 'T4';

export type Status =
  | 'applied'
  | 'in_progress'
  | 'interview'
  | 'under_review'
  | 'rejected'
  | 'offer';

export type Sector = 'RE Finance' | 'Real Estate' | 'Finance' | 'Other';

export const TIER_LABELS: Record<Tier, string> = {
  T1: 'Tier 1 — RE Finance',
  T2: 'Tier 2 — Real Estate',
  T3: 'Tier 3 — Finance',
  T4: 'Tier 4 — Other',
};

export const STATUS_LABELS: Record<Status, string> = {
  applied: 'Applied',
  in_progress: 'In Progress',
  interview: 'Interview',
  under_review: 'Under Review',
  rejected: 'Rejected',
  offer: 'Offer',
};

export const SECTOR_OPTIONS: Sector[] = [
  'RE Finance',
  'Real Estate',
  'Finance',
  'Other',
];

export const PLATFORM_OPTIONS = [
  'Handshake',
  'LinkedIn',
  'Company Website',
  'Referral',
  'Other',
] as const;
