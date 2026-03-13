"use client";

import type { Email } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Reply,
  Forward,
  Link2,
  Mail,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  interview_invite: { bg: "bg-[#C9A84C]/15", text: "text-[#C9A84C]", border: "border-[#C9A84C]/30" },
  rejection: { bg: "bg-[#9B3B3B]/15", text: "text-[#D46A6A]", border: "border-[#9B3B3B]/30" },
  offer: { bg: "bg-[#2D8B6F]/15", text: "text-[#4CC9A0]", border: "border-[#2D8B6F]/30" },
  follow_up_needed: { bg: "bg-[#4A6FA5]/15", text: "text-[#6B9FDB]", border: "border-[#4A6FA5]/30" },
  info_request: { bg: "bg-[#7B5EA7]/15", text: "text-[#A68CD9]", border: "border-[#7B5EA7]/30" },
  newsletter: { bg: "bg-[#8B8FA3]/15", text: "text-[#8B8FA3]", border: "border-[#8B8FA3]/30" },
  other: { bg: "bg-[#8B8FA3]/15", text: "text-[#8B8FA3]", border: "border-[#8B8FA3]/30" },
};

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sanitizeHtml(html: string): string {
  // Basic sanitization: strip script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

interface EmailThreadProps {
  email: Email | null;
  threadEmails: Email[];
}

export function EmailThread({ email, threadEmails }: EmailThreadProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-[#8B8FA3]">
        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
          <Mail className="h-8 w-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#D4C5A9]">No email selected</p>
          <p className="text-xs mt-1">Choose an email from the list to view its contents</p>
        </div>
      </div>
    );
  }

  const colors =
    CLASSIFICATION_COLORS[email.classification || "other"] || CLASSIFICATION_COLORS.other;

  // Show thread emails if available, otherwise just the single email
  const displayEmails = threadEmails.length > 1 ? threadEmails : [email];
  const isThreadView = displayEmails.length > 1;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#F5F0E8] leading-tight mb-2">
              {email.subject || "(no subject)"}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {email.classification && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  {email.classification.replace(/_/g, " ")}
                </Badge>
              )}
              {email.urgency && email.urgency !== "low" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border",
                    email.urgency === "high"
                      ? "bg-[#9B3B3B]/15 text-[#D46A6A] border-[#9B3B3B]/30"
                      : "bg-[#B8860B]/15 text-[#D4A84C] border-[#B8860B]/30"
                  )}
                >
                  {email.urgency} urgency
                </Badge>
              )}
              {isThreadView && (
                <span className="text-xs font-mono text-[#8B8FA3]">
                  {displayEmails.length} messages in thread
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[#8B8FA3] hover:text-[#F5F0E8] hover:bg-white/5"
              title="Reply"
              onClick={() => {
                const lastEmail = displayEmails[displayEmails.length - 1] ?? email;
                const to = encodeURIComponent(lastEmail.fromAddress ?? "");
                const subject = encodeURIComponent(`Re: ${email.subject ?? ""}`);
                window.open(
                  `https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}`,
                  "_blank"
                );
              }}
            >
              <Reply className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[#8B8FA3] hover:text-[#F5F0E8] hover:bg-white/5"
              title="Forward"
              onClick={() => {
                const subject = encodeURIComponent(`Fwd: ${email.subject ?? ""}`);
                window.open(
                  `https://mail.google.com/mail/?view=cm&su=${subject}`,
                  "_blank"
                );
              }}
            >
              <Forward className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[#8B8FA3] hover:text-[#F5F0E8] hover:bg-white/5"
              title="Link to Application"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Email Body / Thread */}
      <div className="flex-1 overflow-y-auto">
        {displayEmails.map((threadEmail, index) => {
          const isLast = index === displayEmails.length - 1;
          const isExpanded = isLast || expandedIds.has(threadEmail.id);

          return (
            <div
              key={threadEmail.id}
              className={cn(
                "border-b border-white/5 last:border-b-0",
                isLast && "bg-white/[0.02]"
              )}
            >
              {/* Message Header */}
              <button
                onClick={() => !isLast && toggleExpand(threadEmail.id)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-center gap-3",
                  !isLast && "hover:bg-white/[0.02] cursor-pointer"
                )}
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-[#8B8FA3]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#F5F0E8] truncate">
                      {threadEmail.fromAddress || "Unknown"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-[#8B8FA3]">
                        {formatFullDate(threadEmail.receivedAt)}
                      </span>
                      {!isLast && (
                        isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-[#8B8FA3]" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[#8B8FA3]" />
                        )
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[#8B8FA3] truncate block">
                    to {threadEmail.toAddress || "me"}
                  </span>
                </div>
              </button>

              {/* Message Body */}
              {isExpanded && (
                <div className="px-4 pb-4 pl-[60px]">
                  {threadEmail.bodyText ? (
                    <div
                      className="prose prose-sm prose-invert max-w-none
                        text-[#D4C5A9] text-sm leading-relaxed
                        prose-a:text-[#C9A84C] prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-[#F5F0E8]
                        prose-headings:text-[#F5F0E8] prose-headings:font-['Playfair_Display']
                        [&_*]:max-w-full overflow-hidden"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(threadEmail.bodyText),
                      }}
                    />
                  ) : threadEmail.snippet ? (
                    <p className="text-sm text-[#D4C5A9] leading-relaxed whitespace-pre-wrap">
                      {threadEmail.snippet}
                    </p>
                  ) : (
                    <p className="text-sm text-[#8B8FA3] italic">No content available</p>
                  )}

                  {/* Suggested Action */}
                  {threadEmail.suggestedAction && isLast && (
                    <div className="mt-4 p-3 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3.5 w-3.5 text-[#C9A84C]" />
                        <span className="text-xs font-medium text-[#C9A84C]">
                          Suggested Action
                        </span>
                      </div>
                      <p className="text-sm text-[#D4C5A9]">
                        {threadEmail.suggestedAction}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
