"use client";

import { useMemo } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { AgentExecutionPanelProps, DepartmentStatusRow } from "@/contracts/ui";

const DEPARTMENT_LABELS: Record<string, string> = {
  cro: "Chief Revenue Officer",
  cio: "Chief Information Officer",
  cmo: "Chief Marketing Officer",
  coo: "Chief Operations Officer",
  cpo: "Chief Product Officer",
  cno: "Chief Networking Officer",
  cfo: "Chief Financial Officer",
};

export function AgentExecutionPanel({ executionId, onClose }: AgentExecutionPanelProps) {
  const { events, isConnected } = useAgentStream(executionId);

  const departments = useMemo(() => {
    const map = new Map<string, DepartmentStatusRow>();

    for (const event of events) {
      if (event.type === "heartbeat" || event.type === "briefing_ready") continue;

      const dept = event.department;

      if (event.type === "agent_start") {
        map.set(dept, {
          department: dept,
          label: DEPARTMENT_LABELS[dept] ?? dept,
          status: "running",
          currentStep: "Initializing...",
        });
      } else if (event.type === "agent_progress") {
        const existing = map.get(dept);
        if (existing) {
          existing.status = "running";
          existing.currentStep = event.step;
          existing.progress = event.progress;
        }
      } else if (event.type === "agent_complete") {
        const existing = map.get(dept);
        if (existing) {
          existing.status = "complete";
          existing.summary = event.summary;
        }
      } else if (event.type === "agent_error") {
        const existing = map.get(dept);
        if (existing) {
          existing.status = "error";
          existing.currentStep = event.error;
        }
      }
    }

    return Array.from(map.values());
  }, [events]);

  const briefingEvent = events.find((e) => e.type === "briefing_ready");

  if (!executionId) return null;

  return (
    <div className="rounded-lg border border-[#C9A84C]/20 bg-[#252540]/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-['Playfair_Display'] text-sm font-semibold text-[#F5F0E8]">
          Agent Operations
        </h3>
        <button onClick={onClose} className="text-[#8B8FA3] hover:text-[#F5F0E8]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isConnected && departments.length === 0 && (
        <div className="flex items-center gap-2 text-[#8B8FA3] text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting to agent stream...
        </div>
      )}

      <div className="space-y-2">
        {departments.map((dept) => (
          <div
            key={dept.department}
            className="flex items-center gap-3 rounded-md bg-[#1A1A2E]/50 px-3 py-2"
          >
            <StatusIcon status={dept.status} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#F5F0E8]">{dept.label}</div>
              <div className="text-xs text-[#8B8FA3] truncate">
                {dept.status === "complete" ? dept.summary : dept.currentStep}
              </div>
            </div>
            {dept.progress != null && dept.status === "running" && (
              <div className="w-16 h-1.5 rounded-full bg-[#1A1A2E] overflow-hidden">
                <div
                  className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                  style={{ width: `${dept.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {briefingEvent && briefingEvent.type === "briefing_ready" && (
        <div className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/5 p-3">
          <p className="text-xs font-medium text-[#C9A84C]">Briefing Ready</p>
          <p className="text-xs text-[#F5F0E8] mt-1">{briefingEvent.headline}</p>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: DepartmentStatusRow["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 text-[#C9A84C] animate-spin" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-[#2D8B6F]" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-[#9B3B3B]" />;
    default:
      return <Clock className="h-4 w-4 text-[#8B8FA3]" />;
  }
}
