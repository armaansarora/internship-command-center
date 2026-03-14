import { FileText } from 'lucide-react';
import { getAllCoverLettersGrouped } from '@/lib/cover-letter-versions';
import { getApplicationsForAutocomplete } from '@/lib/cover-letter-actions';
import { CoverLetterGenerator } from '@/components/cover-letters/cover-letter-generator';
import { EmptyState } from '@/components/shared/empty-state';

export default async function CoverLettersPage() {
  const [grouped, applications] = await Promise.all([
    getAllCoverLettersGrouped(),
    getApplicationsForAutocomplete(),
  ]);

  const companies = Object.keys(grouped);
  const totalLetters = Object.values(grouped).reduce(
    (sum, letters) => sum + letters.length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Cover Letters
        </h1>
        {totalLetters > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary tabular-nums">
            {totalLetters}
          </span>
        )}
      </div>

      {/* Generator */}
      <CoverLetterGenerator applications={applications} />

      {/* Grouped Cover Letters */}
      {companies.length === 0 ? (
        <EmptyState
          icon={FileText}
          variant="cover-letters"
          title="No cover letters yet"
          description="Generate your first cover letter by selecting an application above."
        />
      ) : (
        <div className="space-y-6">
          {companies.map((company) => {
            const letters = grouped[company];
            return (
              <div key={company} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium">{company}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                    {letters.length} version{letters.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {letters.map((cl, idx) => (
                    <div
                      key={cl.id}
                      className="group relative rounded-xl border border-border bg-card p-4 space-y-3 backdrop-blur-sm transition-colors hover:border-primary/30"
                    >
                      {/* Top row: role + badges */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight truncate">
                          {cl.role}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                            v{letters.length - idx}
                          </span>
                          {cl.isActive && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content preview */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                        {cl.content.slice(0, 200)}
                        {cl.content.length > 200 ? '...' : ''}
                      </p>

                      {/* Footer: date */}
                      <p className="text-xs text-muted-foreground/60">
                        {cl.generatedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
