"use client";

import { useState, useCallback } from "react";
import { BellButton } from "./bell-button";
import { AgentExecutionPanel } from "./agent-execution-panel";
import { BriefingCard } from "./briefing-card";
import type { BriefingCardProps } from "@/contracts/ui";

export function DashboardAgentSection({ latestBriefing }: { latestBriefing: BriefingCardProps | null }) {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  const handleRing = useCallback(async (prompt?: string) => {
    setIsRinging(true);
    try {
      const res = await fetch("/api/agents/bell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, trigger: "manual" }),
      });
      const data = await res.json();
      setExecutionId(data.executionId);
      return data.executionId;
    } catch {
      setIsRinging(false);
      return "";
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setExecutionId(null);
    setIsRinging(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BellButton onRing={handleRing} isRinging={isRinging} />
        <span className="text-sm text-[#8B8FA3]">
          {isRinging ? "Agents are working..." : "Ring the bell to start a briefing"}
        </span>
      </div>

      {executionId && (
        <AgentExecutionPanel executionId={executionId} onClose={handleClosePanel} />
      )}

      {latestBriefing && !executionId && (
        <BriefingCard {...latestBriefing} />
      )}
    </div>
  );
}
