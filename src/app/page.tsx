import { getStatusCounts, getActionItems, getRecentActivity } from '@/lib/dashboard';
import { fetchUnreadEmails } from '@/lib/gmail-actions';
import { listUpcomingEvents } from '@/lib/calendar';
import { StatusCounters } from '@/components/dashboard/status-counters';
import { ActionItems } from '@/components/dashboard/action-items';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EmailWidget } from '@/components/dashboard/email-widget';
import { CalendarWidget } from '@/components/dashboard/calendar-widget';
import { QuickAddForm } from '@/components/applications/quick-add-form';
import { DashboardAgentSection } from '@/components/agents/dashboard-agent-section';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const [counts, actionItems, recentActivity] = await Promise.all([
    getStatusCounts(),
    getActionItems(),
    getRecentActivity(),
  ]);

  let emails: Awaited<ReturnType<typeof fetchUnreadEmails>> = [];
  let events: Awaited<ReturnType<typeof listUpcomingEvents>> = [];

  try {
    [emails, events] = await Promise.all([
      fetchUnreadEmails(),
      listUpcomingEvents(),
    ]);
  } catch {
    // Gmail/Calendar may not be configured — fall back to empty arrays
  }

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#F5F0E8]">
          {getGreeting()}, Armaan
        </h1>
        <p className="text-sm text-[#8B8FA3] mt-1">
          Your command center is ready.
        </p>
      </div>

      {/* Status Counters — full width */}
      <StatusCounters counts={counts} />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <section className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#8B8FA3] uppercase tracking-wider mb-4">
              Action Required
            </h2>
            <ActionItems items={actionItems} />
          </section>

          <section className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#8B8FA3] uppercase tracking-wider mb-4">
              Recent Activity
            </h2>
            <ActivityFeed items={recentActivity} />
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#8B8FA3] uppercase tracking-wider mb-4">
              Quick Add
            </h2>
            <QuickAddForm />
          </section>

          <section className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#8B8FA3] uppercase tracking-wider mb-4">
              Inbox
            </h2>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <EmailWidget emails={emails as any} />
          </section>

          <section className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#8B8FA3] uppercase tracking-wider mb-4">
              Upcoming Events
            </h2>
            <CalendarWidget events={events} />
          </section>
        </div>
      </div>

      {/* Agent Section */}
      <DashboardAgentSection latestBriefing={null} />
    </div>
  );
}
