export default function ContactsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded bg-muted animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="h-10 w-72 rounded bg-muted animate-pulse" />
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />

        <div className="rounded-md border border-border">
          <div className="border-b border-border p-4">
            <div className="flex gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-20 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border p-4 last:border-0">
              <div className="flex gap-8">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-5 w-12 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
