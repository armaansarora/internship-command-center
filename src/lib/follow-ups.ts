export interface FollowUpWithApp {
  followUp: {
    id: number;
    applicationId: number;
    dueAt: Date;
    note: string | null;
    completedAt: Date | null;
    dismissed: boolean;
  };
  application: {
    id: number;
    company: string;
    role: string;
    tier: string;
    status: string;
    contactName: string | null;
    contactEmail: string | null;
  };
}

export async function getPendingFollowUps(): Promise<FollowUpWithApp[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getOverdueFollowUps(): Promise<FollowUpWithApp[]> {
  throw new Error("Not implemented — awaiting Phase 1");
}

export async function getSuggestedFollowUps(): Promise<
  Array<{ application: unknown; suggestedDays: number; suggestedDate: Date }>
> {
  throw new Error("Not implemented — awaiting Phase 1");
}
