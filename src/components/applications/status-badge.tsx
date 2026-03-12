'use client';

import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import type { Status } from '@/types';
import { STATUS_LABELS } from '@/types';
import { cn } from '@/lib/utils';

const statusStyles: Record<Status, string> = {
  applied: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  in_progress: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  interview: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  under_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  offer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <motion.span
      className="inline-flex"
      whileHover={{ scale: 1.05 }}
    >
      <Badge variant="outline" className={cn('text-xs font-medium', statusStyles[status])}>
        {STATUS_LABELS[status]}
      </Badge>
    </motion.span>
  );
}
