import { Clock, AlertTriangle } from 'lucide-react';
import {
  getPendingFollowUps,
  getOverdueFollowUps,
  getSuggestedFollowUps,
} from '@/lib/follow-ups';
import { FollowUpList } from '@/components/follow-ups/follow-up-list';
import { SuggestedFollowUps } from '@/components/follow-ups/suggested-follow-ups';
import { EmptyState } from '@/components/shared/empty-state';

export default async function FollowUpsPage() {
  const [pending, overdue, suggested] = await Promise.all([
    getPendingFollowUps(),
    getOverdueFollowUps(),
    getSuggestedFollowUps(),
  ]);

  const totalCount = pending.length + overdue.length;
  const allEmpty =
    pending.length === 0 && overdue.length === 0 && suggested.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Follow-Ups
        </h1>
        {totalCount > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary tabular-nums">
            {totalCount}
          </span>
        )}
        {overdue.length > 0 && (
          <span className="rounded-full bg-red-500/10 px-3 py-0.5 text-sm font-medium text-red-400 tabular-nums">
            {overdue.length} overdue
          </span>
        )}
      </div>

      {allEmpty ? (
        <EmptyState
          icon={Clock}
          variant="follow-ups"
          title="No follow-ups"
          description="You're all caught up. Follow-ups will appear here when applications need attention."
        />
      ) : (
        <div className="space-y-8">
          {/* Overdue Section */}
          {overdue.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h2 className="text-lg font-medium text-red-400">Overdue</h2>
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 tabular-nums">
                  {overdue.length}
                </span>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <FollowUpList items={overdue} />
              </div>
            </section>
          )}

          {/* Pending Section */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium">Pending Approval</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                  {pending.length}
                </span>
              </div>
              <FollowUpList items={pending} />
            </section>
          )}

          {/* Suggested Section */}
          {suggested.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-muted-foreground">
                Suggested
              </h2>
              <SuggestedFollowUps suggestions={suggested as Array<{ application: { id: number; company: string; tier: string; [key: string]: unknown }; suggestedDays: number; suggestedDate: Date }>} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
