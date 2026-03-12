'use client';

import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import type { Tier } from '@/types';
import { cn } from '@/lib/utils';

const tierStyles: Record<Tier, string> = {
  T1: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
  T2: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
  T3: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30',
  T4: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <motion.span
      className="inline-flex"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Badge variant="outline" className={cn('text-xs font-medium', tierStyles[tier])}>
        {tier}
      </Badge>
    </motion.span>
  );
}
