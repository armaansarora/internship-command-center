import { db } from '@/db';
import { applications } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Briefcase } from 'lucide-react';
import { ApplicationsView } from '@/components/applications/applications-view';

export default async function ApplicationsPage() {
  const allApps = await db
    .select()
    .from(applications)
    .orderBy(desc(applications.appliedAt))
    .all();

  return (
    <div>
      {allApps.length > 0 ? (
        <ApplicationsView applications={allApps} />
      ) : (
        <>
          <PageHeader
            title="Applications"
            subtitle="0 total applications tracked"
          />
          <div className="p-6 max-w-[1400px] mx-auto">
            <EmptyState
              icon={Briefcase}
              title="No applications yet"
              description="Start tracking your internship applications to stay organized."
              action={{ label: 'Add Application', href: '#' }}
              variant="applications"
            />
          </div>
        </>
      )}
    </div>
  );
}
