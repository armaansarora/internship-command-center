// @ts-nocheck
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnFiltersState } from '@tanstack/react-table';

interface AppFiltersProps {
  columnFilters: ColumnFiltersState;
  setColumnFilter: (id: string, value: string | undefined) => void;
}

const tierOptions = ['T1', 'T2', 'T3', 'T4'];
const statusOptions = [
  { value: 'applied', label: 'Applied' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'interview', label: 'Interview' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
];
const sectorOptions = ['RE Finance', 'Real Estate', 'Finance', 'Other'];
const platformOptions = [
  'Handshake',
  'LinkedIn',
  'Company Website',
  'Referral',
  'Other',
];

function getFilterValue(
  filters: ColumnFiltersState,
  id: string
): string | undefined {
  const f = filters.find((f) => f.id === id);
  return f?.value as string | undefined;
}

export function AppFilters({ columnFilters, setColumnFilter }: AppFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={getFilterValue(columnFilters, 'tier') || 'all'}
        onValueChange={(v) =>
          setColumnFilter('tier', v === 'all' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[120px] bg-background border-border">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          {tierOptions.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={getFilterValue(columnFilters, 'status') || 'all'}
        onValueChange={(v) =>
          setColumnFilter('status', v === 'all' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[140px] bg-background border-border">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={getFilterValue(columnFilters, 'sector') || 'all'}
        onValueChange={(v) =>
          setColumnFilter('sector', v === 'all' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[140px] bg-background border-border">
          <SelectValue placeholder="Sector" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sectors</SelectItem>
          {sectorOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={getFilterValue(columnFilters, 'platform') || 'all'}
        onValueChange={(v) =>
          setColumnFilter('platform', v === 'all' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[160px] bg-background border-border">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          {platformOptions.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
