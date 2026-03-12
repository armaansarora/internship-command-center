'use client';

import type { Application } from '@/db/schema';
import { ApplicationCard } from './application-card';

interface CardGridViewProps {
  applications: Application[];
}

export function CardGridView({ applications }: CardGridViewProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No applications match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {applications.map((app, i) => (
        <ApplicationCard key={app.id} application={app} index={i} />
      ))}
    </div>
  );
}
