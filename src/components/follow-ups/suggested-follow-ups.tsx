// @ts-nocheck
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/applications/tier-badge';
import { createFollowUp } from '@/lib/follow-up-actions';
type Application = { id: number; company: string; tier: string; [key: string]: unknown };
import type { Tier } from '@/types';
import { CalendarPlus, X } from 'lucide-react';

interface SuggestedFollowUpsProps {
  suggestions: Array<{
    application: Application;
    suggestedDays: number;
    suggestedDate: Date;
  }>;
}

export function SuggestedFollowUps({
  suggestions,
}: SuggestedFollowUpsProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<number | null>(null);

  if (suggestions.length === 0) return null;

  const visible = suggestions.filter((s) => !dismissed.has(s.application.id));
  if (visible.length === 0) return null;

  async function handleAccept(appId: number, suggestedDate: Date) {
    setLoading(appId);
    const fd = new FormData();
    fd.set('applicationId', String(appId));
    fd.set('dueAt', suggestedDate.toISOString());
    await createFollowUp(fd);
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Suggested Follow-Ups
      </h3>
      <div className="space-y-2">
        {visible.slice(0, 5).map((item) => {
          const now = new Date();
          const isOverdue = item.suggestedDate < now;

          return (
            <div
              key={item.application.id}
              className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`/applications/${item.application.id}`}
                  className="text-sm font-medium hover:underline truncate"
                >
                  {item.application.company}
                </Link>
                <TierBadge tier={item.application.tier as Tier} />
                {isOverdue && (
                  <span className="text-xs text-red-400">overdue</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  disabled={loading === item.application.id}
                  onClick={() =>
                    handleAccept(item.application.id, item.suggestedDate)
                  }
                >
                  <CalendarPlus className="h-3 w-3" />
                  {item.suggestedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={() =>
                    setDismissed((prev) =>
                      new Set(prev).add(item.application.id)
                    )
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
