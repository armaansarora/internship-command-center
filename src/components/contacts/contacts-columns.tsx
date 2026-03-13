// @ts-nocheck
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { ContactWithWarmth } from '@/lib/contacts';
import { WarmthBadge } from './warmth-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const relationshipLabels: Record<string, string> = {
  recruiter: 'Recruiter',
  referral: 'Referral',
  alumni: 'Alumni',
  cold_contact: 'Cold Contact',
};

export const contactsColumns: ColumnDef<ContactWithWarmth>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 hover:bg-transparent hover:text-foreground"
      >
        Name
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.name}</span>
    ),
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
      <span className="text-muted-foreground text-sm">{row.original.company}</span>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.role || '--'}</span>
    ),
  },
  {
    accessorKey: 'relationshipType',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs font-medium">
        {row.original.relationshipType && relationshipLabels[row.original.relationshipType] || row.original.relationshipType || "Unknown"}
      </Badge>
    ),
  },
  {
    id: 'warmth',
    header: 'Warmth',
    cell: ({ row }) => <WarmthBadge level={row.original.warmth.level} />,
    sortingFn: (rowA, rowB) => rowB.original.warmth.score - rowA.original.warmth.score,
  },
  {
    accessorKey: 'lastContactedAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 hover:bg-transparent hover:text-foreground"
      >
        Last Contacted
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.original.lastContactedAt;
      if (!date) return <span className="text-muted-foreground">--</span>;
      const d = date instanceof Date ? date : new Date(date);
      return (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(d, { addSuffix: true })}
        </span>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.lastContactedAt;
      const b = rowB.original.lastContactedAt;
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      const dateA = a instanceof Date ? a.getTime() : new Date(a).getTime();
      const dateB = b instanceof Date ? b.getTime() : new Date(b).getTime();
      return dateA - dateB;
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.email || '--'}</span>
    ),
  },
];
