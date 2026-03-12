import {
  getActionItems,
  getStatusCounts,
  getRecentActivity,
  getTrackedCompanyNames,
} from '@/lib/dashboard';
import { getSuggestedFollowUps } from '@/lib/follow-ups';
import { getUnreadApplicationEmails } from '@/lib/gmail';
import { listUpcomingEvents } from '@/lib/calendar';
import { ActionItems } from '@/components/dashboard/action-items';
import { StatusCounters } from '@/components/dashboard/status-counters';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EmailWidget } from '@/components/dashboard/email-widget';
import { CalendarWidget } from '@/components/dashboard/calendar-widget';
import { QuickAddForm } from '@/components/applications/quick-add-form';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { CheckCircle, Briefcase, TrendingUp, Calendar, Bell } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const [actionItems, statusCounts, recentActivity, companyNames, followUps] =
    await Promise.all([
      getActionItems(),
      getStatusCounts(),
      getRecentActivity(),
      getTrackedCompanyNames(),
      getSuggestedFollowUps().catch(() => []),
    ]);

  // Fetch emails and calendar separately so failure doesn't break the dashboard
  const [emailData, calendarEvents] = await Promise.all([
    getUnreadApplicationEmails(companyNames).catch(() => []),
    listUpcomingEvents().catch(() => []),
  ]);

  const interviewCount = statusCounts.interview;
  const activeCount = statusCounts.in_progress + statusCounts.interview + statusCounts.under_review;

  const heroStats = [
    { label: 'Total Applications', value: statusCounts.total, icon: Briefcase, color: 'border-l-primary' },
    { label: 'Active / In Progress', value: activeCount, icon: TrendingUp, color: 'border-l-emerald-400' },
    { label: 'Interviews', value: interviewCount, icon: Calendar, color: 'border-l-fuchsia-400' },
    { label: 'Follow-ups Due', value: followUps.length, icon: Bell, color: 'border-l-amber-400' },
  ];

  return (
    <div>
      <PageHeader
        title={`${getGreeting()}, Armaan`}
        subtitle="Here's what needs your attention"
      >
        <QuickAddForm />
      </PageHeader>

      <div className="p-6 max-w-[1200px] mx-auto space-y-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-xl border border-border border-l-4 ${stat.color} bg-card p-5 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Status Breakdown */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Status Breakdown</h2>
          <StatusCounters counts={statusCounts} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Needs Attention</h2>
              {actionItems.length > 0 ? (
                <ActionItems items={actionItems} />
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="You're all caught up!"
                  description="No items need your attention right now. Keep applying!"
                  action={{ label: 'Browse Applications', href: '/applications' }}
                />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Email Responses</h2>
              <EmailWidget emails={emailData} />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
              <CalendarWidget events={calendarEvents} />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <ActivityFeed items={recentActivity} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
