"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Sparkles } from "lucide-react";
import type { BriefingCardProps } from "@/contracts/ui";

const DEPT_LABELS: Record<string, string> = {
  cro: "Revenue",
  cio: "Intel",
  cmo: "Marketing",
  coo: "Operations",
  cpo: "Product",
  cno: "Network",
  cfo: "Finance",
};

export function BriefingCard({ briefingId, headline, sections, metrics, createdAt }: BriefingCardProps) {
  return (
    <div className="rounded-lg border border-[#C9A84C]/20 bg-[#252540]/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/10 px-4 py-3 flex items-center gap-3">
        <div className="rounded-full bg-[#C9A84C]/10 p-2">
          <Sparkles className="h-4 w-4 text-[#C9A84C]" />
        </div>
        <div className="flex-1">
          <h3 className="font-['Playfair_Display'] text-sm font-semibold text-[#F5F0E8]">
            {headline}
          </h3>
          <p className="text-xs text-[#8B8FA3] mt-0.5">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            {" · "}
            {(metrics.totalDurationMs / 1000).toFixed(1)}s
            {" · "}
            {metrics.totalTokensUsed.toLocaleString()} tokens
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-[#1A1A2E]/50">
        {sections.map((section) => (
          <div key={section.department} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#C9A84C] uppercase">
                {DEPT_LABELS[section.department] ?? section.department}
              </span>
              <span className="text-xs text-[#8B8FA3]">·</span>
              <span className="text-xs font-medium text-[#F5F0E8]">{section.title}</span>
            </div>
            <p className="text-sm text-[#D4C5A9] leading-relaxed">{section.content}</p>

            {section.highlights.length > 0 && (
              <ul className="space-y-1">
                {section.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#8B8FA3]">
                    <ChevronRight className="h-3 w-3 text-[#C9A84C] mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            )}

            {section.pendingActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {section.pendingActions.map((action, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-[#C9A84C]/10 px-2 py-0.5 text-xs text-[#C9A84C]"
                  >
                    {action.description}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
