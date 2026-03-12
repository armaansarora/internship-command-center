'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight, Mail } from 'lucide-react';
import type { FullEmail } from '@/lib/gmail';

interface EmailThreadProps {
  company: string;
  emails: FullEmail[];
}

export function EmailThread({ company, emails }: EmailThreadProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No email history with {company}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => {
        const isExpanded = expandedIds.has(email.id);
        let relativeDate = '';
        try {
          relativeDate = formatDistanceToNow(new Date(email.date), {
            addSuffix: true,
          });
        } catch {
          relativeDate = email.date;
        }

        return (
          <div
            key={email.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <button
              type="button"
              onClick={() => toggleExpand(email.id)}
              className="flex w-full items-start gap-2 text-left"
            >
              <span className="mt-0.5 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {email.isUnread && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <span className="truncate text-sm font-medium">
                    {email.from}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeDate}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {email.subject}
                </p>
                {!isExpanded && (
                  <p className="mt-1 truncate text-xs text-muted-foreground/70">
                    {email.snippet}
                  </p>
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>To: {email.to}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {email.body}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
