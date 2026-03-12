'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Application } from '@/db/schema';
import { TierBadge } from './tier-badge';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { Tier, Status } from '@/types';
import { STATUS_LABELS, TIER_LABELS } from '@/types';
import { updateApplicationStatus, updateApplicationTier } from '@/lib/actions';
import { toast } from 'sonner';

export const columns: ColumnDef<Application>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'company',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 hover:bg-transparent hover:text-foreground"
      >
        Company
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/applications/${row.original.id}`}
        className="font-medium text-foreground hover:text-blue-400 hover:underline transition-colors duration-150"
      >
        {row.original.company}
      </Link>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.role}</span>
    ),
  },
  {
    accessorKey: 'tier',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 hover:bg-transparent hover:text-foreground"
      >
        Tier
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Select
        value={row.original.tier as Tier}
        onValueChange={async (value) => {
          const formData = new FormData();
          formData.set('id', String(row.original.id));
          formData.set('tier', value);
          const result = await updateApplicationTier(formData);
          if (result.error) {
            toast.error('Failed to update tier', { description: result.error });
          } else {
            toast.success(`Tier: ${value}`, { id: 'tier-update' });
          }
        }}
      >
        <SelectTrigger
          className="h-7 w-[80px] border-none bg-transparent hover:bg-accent/50 focus:ring-0"
          onClick={(e) => e.stopPropagation()}
        >
          <TierBadge tier={row.original.tier as Tier} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" onClick={(e) => e.stopPropagation()}>
          {(Object.entries(TIER_LABELS) as [Tier, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 hover:bg-transparent hover:text-foreground"
      >
        Status
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Select
        value={row.original.status as Status}
        onValueChange={async (value) => {
          const formData = new FormData();
          formData.set('id', String(row.original.id));
          formData.set('status', value);
          const result = await updateApplicationStatus(formData);
          if (result.error) {
            toast.error('Failed to update status', { description: result.error });
          } else {
            toast.success(`Status: ${STATUS_LABELS[value as Status]}`, { id: 'status-update' });
          }
        }}
      >
        <SelectTrigger
          className="h-7 w-[140px] border-none bg-transparent hover:bg-accent/50 focus:ring-0"
          onClick={(e) => e.stopPropagation()}
        >
          <StatusBadge status={row.original.status as Status} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" onClick={(e) => e.stopPropagation()}>
          {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'appliedAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 hover:bg-transparent hover:text-foreground"
      >
        Applied
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.original.appliedAt;
      if (!date) return <span className="text-muted-foreground">--</span>;
      const d = date instanceof Date ? date : new Date(date);
      return (
        <div className="text-sm">
          <span className="text-foreground">{format(d, 'MMM d, yyyy')}</span>
          <span className="text-muted-foreground ml-1.5 text-xs">
            {formatDistanceToNow(d, { addSuffix: true })}
          </span>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.appliedAt;
      const b = rowB.original.appliedAt;
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      const dateA = a instanceof Date ? a.getTime() : new Date(a).getTime();
      const dateB = b instanceof Date ? b.getTime() : new Date(b).getTime();
      return dateA - dateB;
    },
  },
  {
    accessorKey: 'sector',
    header: 'Sector',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.sector}
      </span>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.platform || '--'}
      </span>
    ),
    filterFn: 'equals',
  },
];
