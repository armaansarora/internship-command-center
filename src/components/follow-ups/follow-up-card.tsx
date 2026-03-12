'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/applications/tier-badge';
import { StatusBadge } from '@/components/applications/status-badge';
import {
  dismissFollowUp,
  completeFollowUp,
  snoozeFollowUp,
} from '@/lib/follow-up-actions';
import type { FollowUpWithApp } from '@/lib/follow-ups';
import type { Tier, Status } from '@/types';
import {
  Check,
  X,
  Clock,
  Mail,
  CalendarPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { addFollowUpToCalendar } from '@/lib/calendar-actions';
import { SwipeableCard } from '@/components/shared/swipeable-card';
import { useIsMobile } from '@/hooks/use-mobile';

interface FollowUpCardProps {
  data: FollowUpWithApp;
}

export function FollowUpCard({ data }: FollowUpCardProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const { followUp, application } = data;

  const now = new Date();
  const isOverdue = followUp.dueAt < now;
  const daysUntil = Math.ceil(
    (followUp.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  async function handleAction(
    action: typeof dismissFollowUp | typeof completeFollowUp,
    label: string,
  ) {
    setLoading(true);
    const fd = new FormData();
    fd.set('id', String(followUp.id));
    const result = await action(fd);
    if (result?.error) {
      toast.error('Action failed', { description: result.error });
    } else {
      toast.success(`Follow-up ${label}`);
    }
    router.refresh();
    setLoading(false);
  }

  async function handleSnooze(days: number) {
    setLoading(true);
    const fd = new FormData();
    fd.set('id', String(followUp.id));
    fd.set('days', String(days));
    const result = await snoozeFollowUp(fd);
    if (result?.error) {
      toast.error('Action failed', { description: result.error });
    } else {
      toast.success(`Snoozed ${days} days`);
    }
    router.refresh();
    setLoading(false);
  }

  async function handleAddToCalendar() {
    setLoading(true);
    const dueDate = followUp.dueAt.toISOString().split('T')[0];
    const result = await addFollowUpToCalendar(
      application.company,
      application.role,
      dueDate,
      followUp.note ?? undefined
    );
    if (result?.error) {
      toast.error('Failed to add to calendar', { description: result.error, id: 'cal-followup' });
    } else {
      toast.success('Reminder added to calendar', { id: 'cal-followup' });
    }
    setLoading(false);
  }

  const cardContent = (
    <div
      className={`rounded-lg border bg-card p-4 ${
        isOverdue ? 'border-red-500/50' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/applications/${application.id}`}
              className="font-medium text-sm hover:underline truncate"
            >
              {application.company}
            </Link>
            <TierBadge tier={application.tier as Tier} />
            <StatusBadge status={application.status as Status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {application.role}
          </p>
          {followUp.note && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {followUp.note}
            </p>
          )}
          {application.contactEmail && (
            <div className="flex items-center gap-1 mt-1.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {application.contactName || application.contactEmail}
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          <p
            className={`text-sm font-medium ${
              isOverdue ? 'text-red-400' : 'text-muted-foreground'
            }`}
          >
            {isOverdue
              ? `${Math.abs(daysUntil)}d overdue`
              : daysUntil === 0
                ? 'Due today'
                : `In ${daysUntil}d`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {followUp.dueAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={loading}
          onClick={() => handleAction(completeFollowUp, 'completed')}
        >
          <Check className="h-3 w-3" />
          Done
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={loading}
          onClick={() => handleSnooze(3)}
        >
          <Clock className="h-3 w-3" />
          +3d
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={loading}
          onClick={() => handleSnooze(7)}
        >
          <Clock className="h-3 w-3" />
          +7d
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          disabled={loading}
          onClick={handleAddToCalendar}
          title="Add reminder to calendar"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-muted-foreground ml-auto"
          disabled={loading}
          onClick={() => handleAction(dismissFollowUp, 'dismissed')}
        >
          <X className="h-3 w-3" />
          Dismiss
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <SwipeableCard
        onSwipeLeft={() => handleAction(dismissFollowUp, 'dismissed')}
        onSwipeRight={() => handleAction(completeFollowUp, 'completed')}
        leftLabel="Dismiss"
        rightLabel="Done"
      >
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
}
