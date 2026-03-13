"use client";

import { useState, useEffect, useTransition } from "react";
import type { Email } from "@/db/schema";
import { EmailList } from "./email-list";
import { EmailThread } from "./email-thread";
import { OutreachQueue } from "./outreach-queue";
import { cn } from "@/lib/utils";
import { getEmails, getEmailThread, type OutreachWithMeta } from "@/lib/communication-queries";
import { Send, Mail } from "lucide-react";

interface CommunicationsShellProps {
  initialEmails: Email[];
  outreachItems: OutreachWithMeta[];
}

export function CommunicationsShell({
  initialEmails,
  outreachItems,
}: CommunicationsShellProps) {
  const [emails, setEmails] = useState(initialEmails);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"email" | "outreach">("email");
  const [isPending, startTransition] = useTransition();

  // Fetch emails when filter changes
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    startTransition(async () => {
      const fetched = await getEmails(filter === "all" ? undefined : filter);
      setEmails(fetched);
      setSelectedEmail(null);
      setThreadEmails([]);
    });
  };

  // Fetch thread when email selected
  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    if (email.threadId) {
      startTransition(async () => {
        const thread = await getEmailThread(email.threadId!);
        setThreadEmails(thread);
      });
    } else {
      setThreadEmails([]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#F5F0E8]">
              The Mail Room
            </h1>
            <p className="text-sm text-[#8B8FA3] mt-1">
              Classified correspondence and outreach management
            </p>
          </div>

          {/* Tab toggle: Emails / Outreach Queue */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab("email")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                activeTab === "email"
                  ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                  : "text-[#8B8FA3] hover:text-[#D4C5A9]"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              Inbox
            </button>
            <button
              onClick={() => setActiveTab("outreach")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                activeTab === "outreach"
                  ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                  : "text-[#8B8FA3] hover:text-[#D4C5A9]"
              )}
            >
              <Send className="h-3.5 w-3.5" />
              Outreach
              {outreachItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] text-[10px] font-mono">
                  {outreachItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === "email" ? (
        <div className="flex-1 flex mx-6 mb-6 rounded-xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/10">
          {/* Left Panel - Email List (35%) */}
          <div className="w-[35%] border-r border-white/5 flex flex-col min-w-0">
            <EmailList
              emails={emails}
              selectedId={selectedEmail?.id || null}
              onSelectEmail={handleSelectEmail}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Right Panel - Email Thread (65%) */}
          <div className="w-[65%] flex flex-col min-w-0">
            <EmailThread email={selectedEmail} threadEmails={threadEmails} />
          </div>
        </div>
      ) : (
        <div className="flex-1 mx-6 mb-6 rounded-xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/10">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#F5F0E8]">
              Outreach Queue
            </h2>
            <p className="text-xs text-[#8B8FA3] mt-0.5">
              Review and approve AI-generated outreach drafts before sending
            </p>
          </div>
          <OutreachQueue items={outreachItems} />
        </div>
      )}
    </div>
  );
}
