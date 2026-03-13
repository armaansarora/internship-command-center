// @ts-nocheck
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarPlus, Loader2, ExternalLink } from 'lucide-react';
import { addInterviewToCalendar } from '@/lib/calendar-actions';
import { toast } from 'sonner';

interface AddToCalendarProps {
  company: string;
  role: string;
}

export function AddToCalendar({ company, role }: AddToCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [eventLink, setEventLink] = useState<string | null>(null);

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addInterviewToCalendar(formData);

      if ('error' in result && result.error) {
        toast.error('Failed to add to calendar: ' + result.error, {
          id: 'calendar-add',
        });
      } else if ('success' in result && result.success) {
        toast.success('Interview added to calendar!', {
          id: 'calendar-add',
        });
        setExpanded(false);
        if ('htmlLink' in result && result.htmlLink) {
          setEventLink(result.htmlLink);
        }
      }
    });
  }

  if (eventLink) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <CalendarPlus className="h-4 w-4 text-green-500" />
        <a
          href={eventLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          View in Calendar
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 mt-2"
        onClick={() => setExpanded(true)}
      >
        <CalendarPlus className="h-4 w-4" />
        Add Interview to Calendar
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="mt-2 space-y-3 rounded-lg border border-border p-3">
      <input type="hidden" name="company" value={company} />
      <input type="hidden" name="role" value={role} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cal-date" className="text-xs">
            Date
          </Label>
          <Input
            id="cal-date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            required
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cal-time" className="text-xs">
            Time
          </Label>
          <Input
            id="cal-time"
            name="time"
            type="time"
            defaultValue="10:00"
            required
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cal-duration" className="text-xs">
            Duration
          </Label>
          <select
            id="cal-duration"
            name="duration"
            defaultValue="60"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cal-location" className="text-xs">
            Location
          </Label>
          <Input
            id="cal-location"
            name="location"
            placeholder="Optional"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="gap-1.5" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CalendarPlus className="h-3.5 w-3.5" />
          )}
          Create Event
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
