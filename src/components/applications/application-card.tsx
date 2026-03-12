'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import type { Application } from '@/db/schema';
import { TierBadge } from './tier-badge';
import { StatusBadge } from './status-badge';
import type { Tier, Status } from '@/types';
import { MapPin, Calendar } from 'lucide-react';

const tierBorderColors: Record<string, string> = {
  T1: 'border-l-amber-400',
  T2: 'border-l-blue-400',
  T3: 'border-l-violet-400',
  T4: 'border-l-zinc-400',
};

interface ApplicationCardProps {
  application: Application;
  index: number;
}

export function ApplicationCard({ application, index }: ApplicationCardProps) {
  const borderColor = tierBorderColors[application.tier] || 'border-l-zinc-400';
  const appliedDate = application.appliedAt instanceof Date
    ? application.appliedAt
    : new Date(application.appliedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/applications/${application.id}`}>
        <div
          className={`group rounded-xl border border-border border-l-4 ${borderColor} bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {application.company}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {application.role}
              </p>
            </div>
            <TierBadge tier={application.tier as Tier} />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={application.status as Status} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {appliedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {application.platform && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {application.platform}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
