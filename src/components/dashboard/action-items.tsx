'use client';

import Link from 'next/link';
import { TierBadge } from '@/components/applications/tier-badge';
import { AnimatedList, AnimatedItem } from '@/components/shared/animated-list';
import type { ActionItem } from '@/lib/dashboard';
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Target,
} from 'lucide-react';

const priorityConfig: Record<
  number,
  { icon: typeof AlertTriangle; color: string; label: string }
> = {
  1: { icon: Target, color: 'text-fuchsia-400', label: 'Interview' },
  2: { icon: Clock, color: 'text-amber-400', label: 'Stale Lead' },
  3: {
    icon: MessageSquare,
    color: 'text-red-400',
    label: 'Overdue Follow-Up',
  },
  4: {
    icon: AlertTriangle,
    color: 'text-violet-400',
    label: 'No Response',
  },
};

interface ActionItemsProps {
  items: ActionItem[];
}

const borderColorMap: Record<number, string> = {
  1: 'border-l-fuchsia-400',
  2: 'border-l-amber-400',
  3: 'border-l-red-400',
  4: 'border-l-violet-400',
};

export function ActionItems({ items }: ActionItemsProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No urgent items right now. You&apos;re on top of things.
        </p>
      </div>
    );
  }

  return (
    <AnimatedList className="space-y-2">
      {items.slice(0, 8).map((item) => {
        const config = priorityConfig[item.priority] || priorityConfig[4];
        const Icon = config.icon;
        const borderColor = borderColorMap[item.priority] || 'border-l-violet-400';

        return (
          <AnimatedItem key={`${item.id}-${item.priority}`}>
            <Link
              href={`/applications/${item.id}`}
              className={`flex items-center gap-4 rounded-xl border border-border border-l-4 ${borderColor} bg-card p-4 shadow-sm hover:shadow-md hover:bg-accent/30 transition-all duration-200`}
            >
              <div
                className={`flex-shrink-0 ${config.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {item.company}
                  </span>
                  <TierBadge tier={item.tier as 'T1' | 'T2' | 'T3' | 'T4'} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.reason}
                </p>
              </div>
              <span
                className={`text-xs font-medium ${config.color} flex-shrink-0`}
              >
                {config.label}
              </span>
            </Link>
          </AnimatedItem>
        );
      })}
    </AnimatedList>
  );
}
