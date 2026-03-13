"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Send,
  Clock,
  User,
  Building2,
  ChevronDown,
  ChevronUp,
  Inbox,
} from "lucide-react";
import {
  approveOutreach,
  rejectOutreach,
  type OutreachWithMeta,
} from "@/lib/communication-queries";

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cold_email: { bg: "bg-[#4A6FA5]/15", text: "text-[#6B9FDB]", border: "border-[#4A6FA5]/30" },
  follow_up: { bg: "bg-[#C9A84C]/15", text: "text-[#C9A84C]", border: "border-[#C9A84C]/30" },
  thank_you: { bg: "bg-[#2D8B6F]/15", text: "text-[#4CC9A0]", border: "border-[#2D8B6F]/30" },
  networking: { bg: "bg-[#7B5EA7]/15", text: "text-[#A68CD9]", border: "border-[#7B5EA7]/30" },
  cover_letter_send: { bg: "bg-[#B8860B]/15", text: "text-[#D4A84C]", border: "border-[#B8860B]/30" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface OutreachQueueProps {
  items: OutreachWithMeta[];
}

export function OutreachQueue({ items: initialItems }: OutreachQueueProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      await approveOutreach(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setProcessingId(null);
    });
  };

  const handleReject = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      await rejectOutreach(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setProcessingId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#8B8FA3]">
        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
          <Inbox className="h-6 w-6 opacity-40" />
        </div>
        <p className="text-sm">No pending outreach drafts</p>
        <p className="text-xs">AI-generated outreach will appear here for your approval</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {items.map((item) => {
        const typeColors = TYPE_COLORS[item.type || "cold_email"] || TYPE_COLORS.cold_email;
        const isExpanded = expandedId === item.id;
        const isProcessing = processingId === item.id;

        return (
          <div
            key={item.id}
            className={cn(
              "transition-all duration-200",
              isProcessing && "opacity-50 pointer-events-none"
            )}
          >
            {/* Summary Row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Expand toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="text-[#8B8FA3] hover:text-[#D4C5A9] transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* Icon */}
              <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Send className="h-3.5 w-3.5 text-[#8B8FA3]" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[#F5F0E8] truncate">
                    {item.subject || "(no subject)"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 shrink-0 border",
                      typeColors.bg,
                      typeColors.text,
                      typeColors.border
                    )}
                  >
                    {(item.type || "").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#8B8FA3]">
                  {item.contactName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.contactName}
                    </span>
                  )}
                  {item.companyName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {item.companyName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleApprove(item.id)}
                  className="text-[#2D8B6F] hover:text-[#4CC9A0] hover:bg-[#2D8B6F]/10"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleReject(item.id)}
                  className="text-[#9B3B3B] hover:text-[#D46A6A] hover:bg-[#9B3B3B]/10"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>

            {/* Expanded Body */}
            {isExpanded && (
              <div className="px-4 pb-4 pl-[72px]">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="text-sm text-[#D4C5A9] whitespace-pre-wrap leading-relaxed">
                    {item.body || "No content"}
                  </p>
                </div>
                {item.generatedBy && (
                  <p className="mt-2 text-[11px] font-mono text-[#8B8FA3]">
                    Generated by {item.generatedBy}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
