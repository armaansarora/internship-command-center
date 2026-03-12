import { db } from '@/db';
import { followUps, applications } from '@/db/schema';
import { eq, and, isNull, lte, not, inArray, sql } from 'drizzle-orm';
import type { FollowUp, Application } from '@/db/schema';
import { suggestFollowUpDays } from '@/lib/tier-utils';

export type { FollowUpWithApp };

interface FollowUpWithApp {
  followUp: FollowUp;
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

/**
 * Get all pending follow-ups (not completed, not dismissed), with app data
 */
export async function getPendingFollowUps(): Promise<FollowUpWithApp[]> {
  return await db
    .select({
      followUp: followUps,
      application: {
        id: applications.id,
        company: applications.company,
        role: applications.role,
        tier: applications.tier,
        status: applications.status,
        contactName: applications.contactName,
        contactEmail: applications.contactEmail,
      },
    })
    .from(followUps)
    .innerJoin(applications, eq(followUps.applicationId, applications.id))
    .where(
      and(isNull(followUps.completedAt), eq(followUps.dismissed, false))
    )
    .orderBy(followUps.dueAt)
    .all();
}

/**
 * Get overdue follow-ups
 */
export async function getOverdueFollowUps(): Promise<FollowUpWithApp[]> {
  const now = new Date();
  return await db
    .select({
      followUp: followUps,
      application: {
        id: applications.id,
        company: applications.company,
        role: applications.role,
        tier: applications.tier,
        status: applications.status,
        contactName: applications.contactName,
        contactEmail: applications.contactEmail,
      },
    })
    .from(followUps)
    .innerJoin(applications, eq(followUps.applicationId, applications.id))
    .where(
      and(
        lte(followUps.dueAt, now),
        isNull(followUps.completedAt),
        eq(followUps.dismissed, false)
      )
    )
    .orderBy(followUps.dueAt)
    .all();
}

/**
 * Get applications that should have follow-ups but don't
 * (auto-suggest candidates)
 */
export async function getSuggestedFollowUps(): Promise<Array<{
  application: Application;
  suggestedDays: number;
  suggestedDate: Date;
}>> {
  const now = new Date();

  // Get active apps that DON'T already have pending follow-ups (single query)
  const pendingFollowUpAppIds = db
    .select({ applicationId: followUps.applicationId })
    .from(followUps)
    .where(
      and(isNull(followUps.completedAt), eq(followUps.dismissed, false))
    );

  const activeApps = await db
    .select()
    .from(applications)
    .where(
      and(
        not(inArray(applications.status, ['rejected', 'offer'])),
        not(inArray(applications.id, pendingFollowUpAppIds))
      )
    )
    .all();

  const suggestions: Array<{
    application: Application;
    suggestedDays: number;
    suggestedDate: Date;
  }> = [];

  for (const app of activeApps) {

    const days = suggestFollowUpDays(app.tier, app.status);
    const suggestedDate = new Date(app.updatedAt);
    suggestedDate.setDate(suggestedDate.getDate() + days);

    // Only suggest if the date is in the past or within 3 days
    const daysUntilDue = Math.floor(
      (suggestedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue <= 3) {
      suggestions.push({
        application: app,
        suggestedDays: days,
        suggestedDate,
      });
    }
  }

  // Sort: overdue first, then by tier
  suggestions.sort((a, b) => {
    const aDays = Math.floor(
      (a.suggestedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const bDays = Math.floor(
      (b.suggestedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (aDays !== bDays) return aDays - bDays;
    const tierOrder = { T1: 0, T2: 1, T3: 2, T4: 3 };
    return (
      (tierOrder[a.application.tier as keyof typeof tierOrder] ?? 3) -
      (tierOrder[b.application.tier as keyof typeof tierOrder] ?? 3)
    );
  });

  return suggestions;
}
