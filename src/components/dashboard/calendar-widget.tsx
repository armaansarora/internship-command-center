// @ts-nocheck
import { Calendar, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { CalendarEvent } from '@/lib/calendar';

interface CalendarWidgetProps {
  events: CalendarEvent[];
}

export function CalendarWidget({ events }: CalendarWidgetProps) {
  const displayEvents = events.slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Upcoming Events</h3>
        {displayEvents.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {displayEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No upcoming events this week
        </p>
      ) : (
        <div className="space-y-2">
          {displayEvents.map((event) => {
            const isAllDay = !event.start.includes('T');
            let formattedTime = '';

            if (isAllDay) {
              formattedTime = format(parseISO(event.start), 'MMM d');
            } else {
              formattedTime = format(
                parseISO(event.start),
                'MMM d, h:mm a'
              );
            }

            return (
              <div
                key={event.id}
                className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {event.htmlLink ? (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium truncate hover:underline"
                      >
                        {event.summary}
                      </a>
                    ) : (
                      <span className="text-sm font-medium truncate">
                        {event.summary}
                      </span>
                    )}
                    {event.htmlLink && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-0">
                  <span className="text-xs text-muted-foreground">
                    {formattedTime}
                  </span>
                  {event.location && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        &middot;
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {event.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
