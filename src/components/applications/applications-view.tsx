'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Application } from '@/db/schema';
import { PageHeader } from '@/components/layout/page-header';
import { ViewToggle } from './view-toggle';
import { QuickAddForm } from './quick-add-form';
import { AppTable } from './app-table';
import { CardGridView } from './card-grid-view';

interface ApplicationsViewProps {
  applications: Application[];
}

export function ApplicationsView({ applications }: ApplicationsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialView = (searchParams.get('view') as 'table' | 'cards') || 'table';
  const [view, setView] = useState<'table' | 'cards'>(initialView);

  const handleViewChange = (newView: 'table' | 'cards') => {
    setView(newView);
    const params = new URLSearchParams(searchParams.toString());
    if (newView === 'table') {
      params.delete('view');
    } else {
      params.set('view', newView);
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '/applications', { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle={`${applications.length} total applications tracked`}
      >
        <ViewToggle view={view} onViewChange={handleViewChange} />
        <QuickAddForm />
      </PageHeader>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {view === 'table' ? (
          <AppTable data={applications} />
        ) : (
          <CardGridView applications={applications} />
        )}
      </div>
    </>
  );
}
