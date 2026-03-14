import { db } from '@/db';
import { applications, companies } from '@/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { getStatusCounts } from '@/lib/dashboard';
import { StatusCounters } from '@/components/dashboard/status-counters';
import { BarChart3, TrendingUp, Building2, Briefcase } from 'lucide-react';

export default async function AnalyticsPage() {
  const [statusCounts, byTier, bySource, topCompanies] = await Promise.all([
    getStatusCounts(),
    db
      .select({ tier: applications.tier, count: count() })
      .from(applications)
      .groupBy(applications.tier)
      .orderBy(applications.tier),
    db
      .select({ source: applications.source, count: count() })
      .from(applications)
      .groupBy(applications.source)
      .orderBy(desc(count())),
    db
      .select({ company: companies.name, count: count() })
      .from(applications)
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .groupBy(companies.name)
      .orderBy(desc(count()))
      .limit(10),
  ]);

  const tierLabels: Record<number, string> = { 1: 'T1 — RE Finance', 2: 'T2 — Real Estate', 3: 'T3 — Finance', 4: 'T4 — Other' };
  const tierColors: Record<number, string> = { 1: 'bg-amber-500/20 text-amber-400', 2: 'bg-emerald-500/20 text-emerald-400', 3: 'bg-blue-500/20 text-blue-400', 4: 'bg-zinc-500/20 text-zinc-400' };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#F5F0E8]">
          Analytics
        </h1>
        <p className="text-sm text-[#8B8FA3] mt-1">
          Pipeline overview and application metrics
        </p>
      </div>

      <StatusCounters counts={statusCounts} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#C9A84C]" />
            <h2 className="text-sm font-semibold">By Tier</h2>
          </div>
          <div className="space-y-3">
            {byTier.map((row) => {
              const tier = row.tier ?? 4;
              return (
                <div key={tier} className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${tierColors[tier] ?? tierColors[4]}`}>
                    {tierLabels[tier] ?? `T${tier}`}
                  </span>
                  <span className="text-sm font-mono font-bold">{row.count}</span>
                </div>
              );
            })}
            {byTier.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Source Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#C9A84C]" />
            <h2 className="text-sm font-semibold">By Source</h2>
          </div>
          <div className="space-y-3">
            {bySource.filter(r => r.source).map((row) => (
              <div key={row.source} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">
                  {row.source?.replace(/_/g, ' ') ?? 'Unknown'}
                </span>
                <span className="text-sm font-mono font-bold">{row.count}</span>
              </div>
            ))}
            {bySource.filter(r => r.source).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Top Companies */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-[#C9A84C]" />
            <h2 className="text-sm font-semibold">Top Companies</h2>
          </div>
          <div className="space-y-3">
            {topCompanies.map((row, i) => (
              <div key={row.company} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-sm truncate">{row.company}</span>
                </div>
                <span className="text-sm font-mono font-bold flex-shrink-0">{row.count}</span>
              </div>
            ))}
            {topCompanies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
