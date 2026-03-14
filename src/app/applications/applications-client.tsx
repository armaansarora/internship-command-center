'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Briefcase, Calendar, ExternalLink } from 'lucide-react';
import type { Status, Tier } from '@/types';
import { SearchInput } from '@/components/applications/search-input';
import { ViewToggle } from '@/components/applications/view-toggle';
import { AppFilters } from '@/components/applications/app-filters';
import { StatusBadge } from '@/components/applications/status-badge';
import { TierBadge } from '@/components/applications/tier-badge';
import { QuickAddForm } from '@/components/applications/quick-add-form';
import { EmptyState } from '@/components/shared/empty-state';

export interface ApplicationRow {
  id: string;
  company: string;
  role: string;
  status: Status;
  tier: Tier;
  source: string;
  appliedAt: string;
  notes: string;
  contactName: string;
  contactEmail: string;
}

const columnHelper = createColumnHelper<ApplicationRow>();

const columns = [
  columnHelper.accessor('company', {
    header: 'Company',
    cell: (info) => (
      <span className="font-medium text-[#F5F0E8]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('role', {
    header: 'Role',
    cell: (info) => (
      <span className="text-[#D4C5A9]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('tier', {
    header: 'Tier',
    cell: (info) => <TierBadge tier={info.getValue()} />,
  }),
  columnHelper.accessor('appliedAt', {
    header: 'Applied',
    cell: (info) => {
      const val = info.getValue();
      if (!val) return <span className="text-muted-foreground">--</span>;
      return (
        <span className="text-sm text-[#D4C5A9] font-mono">
          {new Date(val).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      );
    },
  }),
  columnHelper.accessor('source', {
    header: 'Source',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">
        {info.getValue() || '--'}
      </span>
    ),
  }),
];

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ApplicationsClientPage({ data }: { data: ApplicationRow[] }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const setColumnFilter = (id: string, value: string | undefined) => {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== id);
      if (value === undefined) return without;
      return [...without, { id, value }];
    });
  };

  const filtered = useMemo(() => {
    let result = data;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.company.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q)
      );
    }

    // Column filters
    for (const filter of columnFilters) {
      const val = filter.value as string;
      if (filter.id === 'tier') {
        result = result.filter((r) => r.tier === val);
      } else if (filter.id === 'status') {
        result = result.filter((r) => r.status === val);
      } else if (filter.id === 'sector') {
        // Sector is not currently in flat data but filter exists in AppFilters
        // No-op for now
      } else if (filter.id === 'platform') {
        result = result.filter((r) => r.source === val);
      }
    }

    return result;
  }, [data, search, columnFilters]);

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="space-y-8 p-6">
        <PageHeader count={0} />
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Start tracking your internship applications to stay organized and never miss a deadline."
          variant="applications"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader count={data.length} />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
        <AppFilters
          columnFilters={columnFilters}
          setColumnFilter={setColumnFilter}
        />
      </div>

      {/* Results count */}
      {search || columnFilters.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {data.length} applications
        </p>
      ) : null}

      {/* Table view */}
      {view === 'table' ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-white/[0.06]"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#D4C5A9]/60"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-10" />
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      <Link
                        href={`/applications/${row.original.id}`}
                        className="block"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Link>
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Link
                      href={`/applications/${row.original.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-4 w-4 text-[#C9A84C]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No applications match your filters.
            </div>
          )}
        </div>
      ) : (
        /* Cards view */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 transition-all duration-200 hover:border-[#C9A84C]/30 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-[#C9A84C]/5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#F5F0E8] truncate">
                    {app.company}
                  </h3>
                  <p className="text-sm text-[#D4C5A9] truncate">{app.role}</p>
                </div>
                <TierBadge tier={app.tier} />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={app.status} />
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {app.appliedAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(app.appliedAt)}
                  </span>
                )}
                {app.source && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {app.source}
                  </span>
                )}
              </div>

              {app.contactName && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-muted-foreground">
                  Contact: {app.contactName}
                </div>
              )}
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No applications match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-[#F5F0E8]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Applications
        </h1>
        <span className="inline-flex items-center rounded-full bg-[#C9A84C]/15 px-2.5 py-0.5 text-sm font-medium text-[#C9A84C] ring-1 ring-[#C9A84C]/20">
          {count}
        </span>
      </div>
      <QuickAddForm />
    </div>
  );
}
