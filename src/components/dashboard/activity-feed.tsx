// @ts-nocheck
'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/applications/status-badge';
import { AnimatedList, AnimatedItem } from '@/components/shared/animated-list';
import type { ActivityItem } from '@/lib/dashboard';
import type { Status } from '@/types';

interface ActivityFeedProps {
  items: ActivityItem[];
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No recent activity.
      </p>
    );
  }

  return (
    <AnimatedList className="space-y-1">
      {items.map((item) => (
        <AnimatedItem key={item.id}>
          <Link
            href={`/applications/${item.id}`}
            className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium truncate">
                {item.company}
              </span>
              <StatusBadge status={item.status as Status} />
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {timeAgo(item.updatedAt)}
            </span>
          </Link>
        </AnimatedItem>
      ))}
    </AnimatedList>
  );
}
