import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6">
      {/* Header: title + subtitle */}
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Generator area */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
