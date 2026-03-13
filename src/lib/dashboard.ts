export interface ActionItem {
  id: number;
  company: string;
  role: string;
  tier: string;
  status: string;
  reason: string;
  priority: number;
  appliedAt: Date;
  contactName: string | null;
}

export interface StatusCounts {
  total: number;
  applied: number;
  in_progress: number;
  interview: number;
  under_review: number;
  rejected: number;
  offer: number;
}

export interface ActivityItem {
  id: number;
  company: string;
  role: string;
  status: string;
  updatedAt: Date;
}

export async function getActionItems(): Promise<ActionItem[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getStatusCounts(): Promise<StatusCounts> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getTrackedCompanyNames(): Promise<string[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}
