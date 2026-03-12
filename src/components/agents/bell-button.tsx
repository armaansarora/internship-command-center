"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BellButtonProps } from "@/contracts/ui";

export function BellButton({ onRing, isRinging, disabled }: BellButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || isRinging}
      onClick={() => onRing()}
      className={cn(
        "relative h-10 w-10 rounded-full transition-all duration-300",
        "hover:bg-[#C9A84C]/10",
        isRinging && "animate-pulse"
      )}
      title="Ring the bell — assemble the team"
    >
      <Bell
        className={cn(
          "h-5 w-5 transition-colors",
          isRinging ? "text-[#C9A84C]" : "text-[#8B8FA3]"
        )}
      />
      {isRinging && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#C9A84C] animate-ping" />
      )}
    </Button>
  );
}
