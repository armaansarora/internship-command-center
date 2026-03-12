import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-8">
      {/* Header: title + subtitle */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      {/* First section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-28 w-full rounded-lg border border-border"
          />
        ))}
      </div>

      {/* Second section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-28 w-full rounded-lg border border-border"
          />
        ))}
      </div>
    </div>
  );
}
