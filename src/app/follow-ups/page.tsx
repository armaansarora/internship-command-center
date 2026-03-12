import { getPendingFollowUps, getSuggestedFollowUps } from '@/lib/follow-ups';
import { FollowUpList } from '@/components/follow-ups/follow-up-list';
import { SuggestedFollowUps } from '@/components/follow-ups/suggested-follow-ups';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Bell } from 'lucide-react';

export default async function FollowUpsPage() {
  const pending = await getPendingFollowUps();
  const suggestions = await getSuggestedFollowUps();

  const overdue = pending.filter((p) => p.followUp.dueAt < new Date());
  const upcoming = pending.filter((p) => p.followUp.dueAt >= new Date());

  const subtitleParts = [`${pending.length} pending`];
  if (overdue.length > 0) subtitleParts.push(`${overdue.length} overdue`);

  return (
    <div className="space-y-0">
      <PageHeader
        title="Follow-Ups"
        subtitle={subtitleParts.join(' \u00b7 ')}
      />

      <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-8">
        {overdue.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-red-400">Overdue</h2>
            <FollowUpList items={overdue} />
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Upcoming</h2>
            <FollowUpList items={upcoming} />
          </div>
        )}

        <SuggestedFollowUps suggestions={suggestions} />

        {pending.length === 0 && suggestions.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No follow-ups pending"
            description="You're all caught up! Follow-ups will appear here when you schedule them from application detail pages."
            action={{ label: 'View Applications', href: '/applications' }}
            variant="follow-ups"
          />
        )}
      </div>
    </div>
  );
}
