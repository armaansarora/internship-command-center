"use client";

import { useState } from "react";
import type { Email } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const CLASSIFICATION_TABS = [
  { value: "all", label: "All" },
  { value: "interview_invite", label: "Interview" },
  { value: "follow_up_needed", label: "Follow-up" },
  { value: "offer", label: "Offer" },
  { value: "rejection", label: "Rejection" },
  { value: "other", label: "Other" },
] as const;

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  interview_invite: { bg: "bg-[#C9A84C]/15", text: "text-[#C9A84C]", border: "border-[#C9A84C]/30" },
  rejection: { bg: "bg-[#9B3B3B]/15", text: "text-[#D46A6A]", border: "border-[#9B3B3B]/30" },
  offer: { bg: "bg-[#2D8B6F]/15", text: "text-[#4CC9A0]", border: "border-[#2D8B6F]/30" },
  follow_up_needed: { bg: "bg-[#4A6FA5]/15", text: "text-[#6B9FDB]", border: "border-[#4A6FA5]/30" },
  info_request: { bg: "bg-[#7B5EA7]/15", text: "text-[#A68CD9]", border: "border-[#7B5EA7]/30" },
  newsletter: { bg: "bg-[#8B8FA3]/15", text: "text-[#8B8FA3]", border: "border-[#8B8FA3]/30" },
  other: { bg: "bg-[#8B8FA3]/15", text: "text-[#8B8FA3]", border: "border-[#8B8FA3]/30" },
};

const URGENCY_INDICATOR: Record<string, string> = {
  high: "bg-[#9B3B3B]",
  medium: "bg-[#B8860B]",
  low: "bg-[#8B8FA3]",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function extractSenderName(fromAddress: string | null): string {
  if (!fromAddress) return "Unknown";
  // Try to extract name from "Name <email>" format
  const match = fromAddress.match(/^(.+?)\s*<.+>$/);
  if (match) return match[1].trim();
  // Otherwise just return the email
  return fromAddress.split("@")[0];
}

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelectEmail: (email: Email) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function EmailList({
  emails,
  selectedId,
  onSelectEmail,
  activeFilter,
  onFilterChange,
}: EmailListProps) {
  const [search, setSearch] = useState("");

  const filteredEmails = emails.filter((email) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        (email.subject || "").toLowerCase().includes(searchLower) ||
        (email.fromAddress || "").toLowerCase().includes(searchLower) ||
        (email.snippet || "").toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B8FA3]" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm bg-white/5 border-white/10 text-[#F5F0E8] placeholder:text-[#8B8FA3] focus-visible:ring-[#C9A84C]/30"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-none">
        {CLASSIFICATION_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200",
              activeFilter === tab.value
                ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30"
                : "text-[#8B8FA3] hover:text-[#D4C5A9] hover:bg-white/5 border border-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 text-[11px] font-mono text-[#8B8FA3]">
        {filteredEmails.length} email{filteredEmails.length !== 1 ? "s" : ""}
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8B8FA3] px-6">
            <Mail className="h-8 w-8 opacity-40" />
            <p className="text-sm text-center">No emails found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEmails.map((email) => {
              const colors = CLASSIFICATION_COLORS[email.classification || "other"] || CLASSIFICATION_COLORS.other;
              const isSelected = selectedId === email.id;

              return (
                <button
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className={cn(
                    "w-full text-left px-3 py-3 transition-all duration-150 group",
                    isSelected
                      ? "bg-[#C9A84C]/10 border-l-2 border-l-[#C9A84C]"
                      : "hover:bg-white/[0.03] border-l-2 border-l-transparent",
                    !email.isRead && "bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Urgency dot */}
                    <div className="mt-1.5 shrink-0">
                      {email.urgency ? (
                        <span
                          className={cn(
                            "block h-2 w-2 rounded-full",
                            URGENCY_INDICATOR[email.urgency] || URGENCY_INDICATOR.low
                          )}
                        />
                      ) : (
                        <span className="block h-2 w-2" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* From + Date */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={cn(
                            "text-sm truncate",
                            !email.isRead
                              ? "font-semibold text-[#F5F0E8]"
                              : "font-medium text-[#D4C5A9]"
                          )}
                        >
                          {extractSenderName(email.fromAddress)}
                        </span>
                        <span className="text-[11px] font-mono text-[#8B8FA3] shrink-0">
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>

                      {/* Subject */}
                      <p
                        className={cn(
                          "text-sm truncate mb-1",
                          !email.isRead ? "text-[#F5F0E8]" : "text-[#D4C5A9]/80"
                        )}
                      >
                        {email.subject || "(no subject)"}
                      </p>

                      {/* Snippet + Classification Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[#8B8FA3] truncate flex-1">
                          {email.snippet}
                        </p>
                        {email.classification && email.classification !== "other" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 shrink-0 border",
                              colors.bg,
                              colors.text,
                              colors.border
                            )}
                          >
                            {email.classification.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
