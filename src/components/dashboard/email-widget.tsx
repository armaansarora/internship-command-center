import { Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CompanyEmails } from '@/lib/gmail';

interface EmailWidgetProps {
  emails: CompanyEmails[];
}

export function EmailWidget({ emails }: EmailWidgetProps) {
  // Flatten all emails across companies, take max 5
  const allEmails = emails
    .flatMap((ce) => ce.emails.map((e) => ({ ...e, company: ce.company })))
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Email Responses</h3>
        {allEmails.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {allEmails.length} unread
          </span>
        )}
      </div>

      {allEmails.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No new emails
        </p>
      ) : (
        <div className="space-y-2">
          {allEmails.map((email) => {
            const emailDate = email.date ? new Date(email.date) : null;
            const relativeTime = emailDate
              ? formatDistanceToNow(emailDate, { addSuffix: true })
              : '';

            return (
              <div
                key={email.id}
                className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {email.isUnread && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {email.company}
                    </span>
                  </div>
                  {relativeTime && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {relativeTime}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate pl-4">
                  {email.subject || email.snippet || 'No subject'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
