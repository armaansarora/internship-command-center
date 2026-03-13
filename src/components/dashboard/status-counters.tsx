// @ts-nocheck
'use client';

import { motion } from 'motion/react';
import type { StatusCounts } from '@/lib/dashboard';

interface StatusCountersProps {
  counts: StatusCounts;
}

const counterItems: Array<{
  key: keyof Omit<StatusCounts, 'total'>;
  label: string;
  borderColor: string;
  textColor: string;
}> = [
  { key: 'applied', label: 'Applied', borderColor: 'border-l-zinc-400', textColor: 'text-zinc-500 dark:text-zinc-400' },
  { key: 'in_progress', label: 'In Progress', borderColor: 'border-l-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'interview', label: 'Interview', borderColor: 'border-l-fuchsia-400', textColor: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { key: 'under_review', label: 'Under Review', borderColor: 'border-l-amber-400', textColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'offer', label: 'Offer', borderColor: 'border-l-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'rejected', label: 'Rejected', borderColor: 'border-l-red-400', textColor: 'text-red-600 dark:text-red-400' },
];

export function StatusCounters({ counts }: StatusCountersProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      <motion.div
        className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-sm"
        whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-3xl font-bold tracking-tight text-primary">{counts.total}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">Total</p>
      </motion.div>
      {counterItems.map((item, i) => (
        <motion.div
          key={item.key}
          className={`rounded-xl border border-border border-l-4 ${item.borderColor} bg-card p-4 shadow-sm`}
          whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          transition={{ duration: 0.2 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ transition: { duration: 0.2, delay: i * 0.05 } } as any)}
        >
          <p className={`text-3xl font-bold tracking-tight ${item.textColor}`}>
            {counts[item.key]}
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
