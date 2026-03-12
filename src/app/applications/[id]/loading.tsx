import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-40" />

      {/* Heading area: company name, role, badges */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Main grid: details + sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Details card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Notes card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-6">
          {/* Status editor card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>

          {/* Contact card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>

          {/* Follow-up card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>

          {/* Company research card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
